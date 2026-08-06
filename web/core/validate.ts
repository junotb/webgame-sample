/**
 * 콘텐츠 번들 빌드 검증 (D4) — 참조 무결성을 로드 시점에 강제한다.
 * 검사 대상: 효과 경로(구역·메나스·NPC·스탯·스킬 ID), 기억 비가역,
 * 판정 참조, 조건 경로, 텍스트 변형의 첫-매치 규칙.
 * 순수 함수 — 오류 문자열 배열을 반환하며, 비어 있으면 유효하다.
 */
import type { Check, Condition, ContentBundle, TemplateEffect, TextVariant } from './schema';

const ZONE_IDS = ['d2', 'd5', 'd7'];
const NPC_IDS = ['protagonist'];
const STAT_IDS = ['repair', 'insight', 'procedure', 'nerve'];
const SKILL_IDS = ['inscription', 'flowsense'];
const MENACE_IDS = ['fatigue', 'scrutiny', 'unrest'];
const CARD_FACES = ['inspection', 'patrol', 'liaison', 'supply', 'survey'];
const MULTIDAY_MAX_DAYS = 3;
const ENCOUNTER_ACTIONS = ['observe', 'soothe', 'burn', 'withdraw'];
const ENCOUNTER_OUTCOMES = ['burned', 'soothed', 'withdrawn', 'expired'];

/** 스키마의 EffectPath와 1:1 — 스키마 타입이 바뀌면 여기도 갱신해야 한다 */
function isValidEffectPath(path: string): boolean {
  const segs = path.split('.');
  if (segs[0] === 'self') {
    if (segs.length === 2) return segs[1] === 'memory';
    if (segs.length === 3 && segs[1] === 'stats') return STAT_IDS.includes(segs[2]);
    // 등급(self.skills.*)은 효과 대상이 아니다 — 쓰기는 경험치(skillXp) 경유 (core/skills.ts)
    if (segs.length === 3 && segs[1] === 'skillXp') return SKILL_IDS.includes(segs[2]);
    return false;
  }
  if (segs[0] === 'world') {
    if (segs.length === 4 && segs[1] === 'zones' && segs[3] === 'decay')
      return ZONE_IDS.includes(segs[2]);
    if (segs.length === 3 && segs[1] === 'menace') return MENACE_IDS.includes(segs[2]);
    if (segs.length === 4 && segs[1] === 'npcs' && segs[3] === 'trust')
      return NPC_IDS.includes(segs[2]);
    if (segs.length >= 3 && segs[1] === 'flags') return true;
    return false;
  }
  return false;
}

function checkEffect(effect: TemplateEffect, allowZonePlaceholder: boolean, where: string, errors: string[]): void {
  const { path, op, value } = effect;

  const placeholders = path.match(/\{[^}]*\}/g) ?? [];
  const unknown = placeholders.filter((p) => p !== '{zone}');
  if (unknown.length > 0) {
    errors.push(`${where}: 알 수 없는 치환자 ${unknown.join(', ')} (경로: ${path})`);
    return;
  }
  if (placeholders.length > 0 && !allowZonePlaceholder) {
    errors.push(`${where}: {zone} 치환자는 지시서 템플릿에서만 허용됨 (경로: ${path})`);
    return;
  }
  // 치환자 소거 후 구체 경로로 검증 (템플릿은 임의 구역으로 바인딩해 본다)
  const concrete = path.replaceAll('{zone}', ZONE_IDS[0]);
  if (!isValidEffectPath(concrete)) {
    errors.push(`${where}: 스키마에 없는 효과 경로 '${path}'`);
  }

  if (path === 'self.memory' && (op === 'set' || (op === 'add' && value < 0))) {
    errors.push(`${where}: 기억(self.memory)은 비가역 — 감소 가능 효과(${op} ${value}) 거부`);
  }
  if (path.startsWith('self.skillXp.') && (op === 'set' || (op === 'add' && value < 0))) {
    errors.push(`${where}: 경험치(${path})는 비가역 — 감소 가능 효과(${op} ${value}) 거부`);
  }
}

function checkCheck(check: Check, where: string, errors: string[]): void {
  if (check.kind === 'broad' && !STAT_IDS.includes(check.stat)) {
    errors.push(`${where}: 알 수 없는 스탯 '${check.stat}'`);
  }
  if (check.kind === 'narrow' && !SKILL_IDS.includes(check.skill)) {
    errors.push(`${where}: 알 수 없는 스킬 '${check.skill}'`);
  }
}

function checkConditions(conditions: Condition[], where: string, errors: string[], allowZonePlaceholder = false): void {
  for (const cond of conditions) {
    const hasPlaceholder = cond.path.includes('{zone}');
    if (hasPlaceholder && !allowZonePlaceholder) {
      errors.push(`${where}: {zone} 조건 치환자는 지시서 템플릿 본문에서만 허용됨 (경로: ${cond.path})`);
      continue;
    }
    const concrete = cond.path.replaceAll('{zone}', ZONE_IDS[0]);
    const segs = concrete.split('.');
    const isSkillLevel = segs.length === 3 && segs[0] === 'self' && segs[1] === 'skills' && SKILL_IDS.includes(segs[2]);
    if (concrete !== 'world.calendar.day' && !isSkillLevel && !isValidEffectPath(concrete)) {
      errors.push(`${where}: 스키마에 없는 조건 경로 '${cond.path}'`);
    }
    if (cond.gte === undefined && cond.lte === undefined) {
      errors.push(`${where}: 조건에 gte/lte가 하나도 없음 (경로: ${cond.path})`);
    }
  }
}

/** 첫-매치 규칙: 무조건 기본 변형이 정확히 마지막에 온다 */
function checkVariants(body: TextVariant[], where: string, errors: string[], allowZonePlaceholder = false): void {
  if (body.length === 0) {
    errors.push(`${where}: 본문 변형이 비어 있음`);
    return;
  }
  body.forEach((v, i) => {
    const isDefault = !v.if || v.if.length === 0;
    const isLast = i === body.length - 1;
    if (isDefault && !isLast) {
      errors.push(`${where}: 무조건 변형이 마지막이 아님 (index ${i}) — 뒤 변형이 도달 불가`);
    }
    if (!isDefault) checkConditions(v.if!, `${where} 변형[${i}]`, errors, allowZonePlaceholder);
  });
  const last = body[body.length - 1];
  if (last.if && last.if.length > 0) {
    errors.push(`${where}: 무조건 기본 변형이 없음 — 모든 조건 불일치 시 본문이 사라진다`);
  }
}

/**
 * 구역 도면 (UI 층위 사양 §7).
 *
 * 핵심 규칙: **모든 지시서 템플릿의 siteId가 모든 도면에 존재해야 한다.**
 * 템플릿은 배치 구역에 따라 어느 도면에든 바인딩될 수 있으므로, 도면 하나라도
 * 지점이 빠지면 그 구역에 배치되는 순간 마커 없는 지시서가 생긴다.
 * 나중에 d2/d7 도면을 추가할 때 조용히 비는 대신 검증에서 터진다.
 */
function checkZoneMaps(bundle: ContentBundle, errors: string[]): void {
  const maps = bundle.zoneMaps ?? [];
  if (maps.length === 0) {
    errors.push('구역 도면이 하나도 없음 — 배치 구역의 지도를 그릴 수 없다');
    return;
  }

  const seenZones = new Set<string>();
  for (const map of maps) {
    const where = `구역 도면 ${map.zone}`;
    if (!ZONE_IDS.includes(map.zone)) errors.push(`${where}: 알 수 없는 구역 id`);
    if (seenZones.has(map.zone)) errors.push(`중복 구역 도면: ${map.zone}`);
    seenZones.add(map.zone);
    if (!map.title) errors.push(`${where}: title이 비어 있음`);

    const seenSites = new Set<string>();
    for (const site of map.sites) {
      const siteWhere = `${where} 지점 ${site.id}`;
      if (!site.id) errors.push(`${where}: 지점 id가 비어 있음`);
      if (seenSites.has(site.id)) errors.push(`${where}: 중복 지점 id '${site.id}'`);
      seenSites.add(site.id);
      if (!site.label) errors.push(`${siteWhere}: label이 비어 있음 — 지점명은 표면 층이다`);
      for (const [axis, value] of [['x', site.x], ['y', site.y]] as const) {
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 100) {
          errors.push(`${siteWhere}: ${axis}는 0~100이어야 함 (현재: ${value})`);
        }
      }
    }

    for (const t of bundle.orderTemplates) {
      if (!seenSites.has(t.siteId)) {
        errors.push(`${where}: 지시서 템플릿 ${t.id}의 지점 '${t.siteId}'이(가) 이 도면에 없음`);
      }
    }
  }
}

export function validateBundle(bundle: ContentBundle): string[] {
  const errors: string[] = [];

  if (!bundle.bundleId) errors.push('bundleId가 비어 있음');

  const encounterIds = new Set<string>();
  for (const e of bundle.encounters) {
    const where = `조우 ${e.id}`;
    if (encounterIds.has(e.id)) errors.push(`중복 조우 id: ${e.id}`);
    encounterIds.add(e.id);

    if (!Number.isInteger(e.maxTurns) || e.maxTurns < 3 || e.maxTurns > 5) {
      errors.push(`${where}: maxTurns는 3~5 정수여야 함 (현재: ${e.maxTurns})`);
    }
    if (!Number.isInteger(e.calmToSleep) || e.calmToSleep < 1 || e.calmToSleep > 3) {
      errors.push(`${where}: calmToSleep은 1~3 정수여야 함 (현재: ${e.calmToSleep})`);
    }
    checkVariants(e.intro, `${where} intro`, errors, true);
    for (const actionId of ENCOUNTER_ACTIONS) {
      const action = e.actions?.[actionId as keyof typeof e.actions];
      if (!action) {
        errors.push(`${where}: 행동 '${actionId}' 누락 — 4행동 전부 필요`);
        continue;
      }
      checkCheck(action.check, `${where} 행동 ${actionId}`, errors);
    }
    for (const outcomeId of ENCOUNTER_OUTCOMES) {
      const outcome = e.outcomes?.[outcomeId as keyof typeof e.outcomes];
      if (!outcome) {
        errors.push(`${where}: outcome '${outcomeId}' 누락 — 4결말 전부 필요`);
        continue;
      }
      outcome.effects.forEach((ef) => checkEffect(ef, true, `${where} outcome ${outcomeId}`, errors));
    }
  }

  const seenTemplateIds = new Set<string>();
  for (const t of bundle.orderTemplates) {
    const where = `지시서 템플릿 ${t.id}`;
    if (seenTemplateIds.has(t.id)) errors.push(`중복 지시서 템플릿 id: ${t.id}`);
    seenTemplateIds.add(t.id);

    if (!Number.isInteger(t.weight) || t.weight < 1 || t.weight > 3) {
      errors.push(`${where}: weight는 1~3 정수여야 함 (현재: ${t.weight})`);
    }
    if (!CARD_FACES.includes(t.face)) {
      errors.push(`${where}: 알 수 없는 카드 얼굴 '${t.face}' — 표면 층은 조직의 언어만 허용 (${CARD_FACES.join('/')})`);
    }
    if (!t.siteId) errors.push(`${where}: siteId가 비어 있음 — 지도에 놓일 자리가 없다`);

    // 서사 전제 (v3 §4 정정) — 생성 시점(구역 바인딩 전)에 평가되므로 {zone} 불가
    if (t.requirements) checkConditions(t.requirements, `${where} requirements`, errors);

    // 제목 = 단서가 실리는 자리. 본문과 같은 변형 계약을 따른다
    checkVariants(t.title, `${where} 제목`, errors, true);
    // 단서는 한 축만 (v3 §4·§7): 제목 변형 조건에 기억과 기술을 섞지 않는다
    const clueAxes = new Set(
      (t.title ?? [])
        .flatMap((v) => v.if ?? [])
        .map((c) => (c.path === 'self.memory' ? 'memory' : c.path.startsWith('self.skills.') ? 'skill' : 'other')),
    );
    clueAxes.delete('other');
    if (clueAxes.size > 1) {
      errors.push(`${where}: 제목 단서에 기억·기술 축이 섞임 — 카드 하나는 한 축만 쓴다 (v3 §4)`);
    }

    checkVariants(t.body, where, errors, true);
    t.options.forEach((opt, i) => {
      const optWhere = `${where} 옵션[${i}]`;
      checkCheck(opt.check, optWhere, errors);
      if (opt.startsEncounter && !encounterIds.has(opt.startsEncounter)) {
        errors.push(`${optWhere}: 존재하지 않는 조우 참조 '${opt.startsEncounter}'`);
      }
      opt.onSuccess.effects.forEach((e) => checkEffect(e, true, `${optWhere} onSuccess`, errors));
      opt.onFailure?.effects.forEach((e) => checkEffect(e, true, `${optWhere} onFailure`, errors));
    });
  }

  const seenStoryletIds = new Set<string>();
  for (const s of bundle.storylets) {
    const where = `스토리렛 ${s.id}`;
    if (seenStoryletIds.has(s.id)) errors.push(`중복 스토리렛 id: ${s.id}`);
    seenStoryletIds.add(s.id);

    checkConditions(s.requirements, `${where} requirements`, errors);
    checkVariants(s.body, where, errors);
    s.choices.forEach((c, i) => {
      const choiceWhere = `${where} 선택지[${i}]`;
      checkCheck(c.check, choiceWhere, errors);
      if (c.startsMultiday) {
        const { id, days } = c.startsMultiday;
        if (!id) errors.push(`${choiceWhere}: startsMultiday.id가 비어 있음`);
        if (!Number.isInteger(days) || days < 1 || days > MULTIDAY_MAX_DAYS) {
          errors.push(`${choiceWhere}: startsMultiday.days는 1~${MULTIDAY_MAX_DAYS} 정수여야 함 (현재: ${days})`);
        }
      }
      c.onSuccess.effects.forEach((e) => checkEffect(e, false, `${choiceWhere} onSuccess`, errors));
      c.onFailure?.effects.forEach((e) => checkEffect(e, false, `${choiceWhere} onFailure`, errors));
    });
  }

  checkZoneMaps(bundle, errors);

  return errors;
}
