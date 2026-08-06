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

/** 스키마의 EffectPath와 1:1 — 스키마 타입이 바뀌면 여기도 갱신해야 한다 */
function isValidEffectPath(path: string): boolean {
  const segs = path.split('.');
  if (segs[0] === 'self') {
    if (segs.length === 2) return segs[1] === 'memory';
    if (segs.length === 3 && segs[1] === 'stats') return STAT_IDS.includes(segs[2]);
    if (segs.length === 3 && segs[1] === 'skills') return SKILL_IDS.includes(segs[2]);
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
}

function checkCheck(check: Check, where: string, errors: string[]): void {
  if (check.kind === 'broad' && !STAT_IDS.includes(check.stat)) {
    errors.push(`${where}: 알 수 없는 스탯 '${check.stat}'`);
  }
  if (check.kind === 'narrow' && !SKILL_IDS.includes(check.skill)) {
    errors.push(`${where}: 알 수 없는 스킬 '${check.skill}'`);
  }
}

function checkConditions(conditions: Condition[], where: string, errors: string[]): void {
  for (const cond of conditions) {
    if (cond.path !== 'world.calendar.day' && !isValidEffectPath(cond.path)) {
      errors.push(`${where}: 스키마에 없는 조건 경로 '${cond.path}'`);
    }
    if (cond.gte === undefined && cond.lte === undefined) {
      errors.push(`${where}: 조건에 gte/lte가 하나도 없음 (경로: ${cond.path})`);
    }
  }
}

/** 첫-매치 규칙: 무조건 기본 변형이 정확히 마지막에 온다 */
function checkVariants(body: TextVariant[], where: string, errors: string[]): void {
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
    if (!isDefault) checkConditions(v.if!, `${where} 변형[${i}]`, errors);
  });
  const last = body[body.length - 1];
  if (last.if && last.if.length > 0) {
    errors.push(`${where}: 무조건 기본 변형이 없음 — 모든 조건 불일치 시 본문이 사라진다`);
  }
}

export function validateBundle(bundle: ContentBundle): string[] {
  const errors: string[] = [];

  if (!bundle.bundleId) errors.push('bundleId가 비어 있음');

  const seenTemplateIds = new Set<string>();
  for (const t of bundle.orderTemplates) {
    const where = `지시서 템플릿 ${t.id}`;
    if (seenTemplateIds.has(t.id)) errors.push(`중복 지시서 템플릿 id: ${t.id}`);
    seenTemplateIds.add(t.id);

    if (!Number.isInteger(t.weight) || t.weight < 1 || t.weight > 3) {
      errors.push(`${where}: weight는 1~3 정수여야 함 (현재: ${t.weight})`);
    }

    checkVariants(t.body, where, errors);
    t.options.forEach((opt, i) => {
      const optWhere = `${where} 옵션[${i}]`;
      checkCheck(opt.check, optWhere, errors);
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
      c.onSuccess.effects.forEach((e) => checkEffect(e, false, `${choiceWhere} onSuccess`, errors));
      c.onFailure?.effects.forEach((e) => checkEffect(e, false, `${choiceWhere} onFailure`, errors));
    });
  }

  return errors;
}
