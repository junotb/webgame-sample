# 02 — 게임 시스템과 공식

모든 공식은 코드와 1:1 대응. 출처 파일을 함께 표기한다.

## 1. 스킬 숙련 시스템 (`data.ts`, `state.ts`)

- 스킬 **17종**, 4계열: 물리(날붙이·둔기·창·맨손·활·투척) / 방어(갑옷·회피·방패) / 마법(원소·영혼·빛·어둠) / 보조(무기 숙련·함정 해체·몬스터 식별·탐색).
- 숙련 3단계: `RANK_NAME = ["—","노비스","숙련","달인"]`, 위력 배율 `RANK_MULT = [0, 1.0, 1.55, 2.3]`.
- 숙련은 개별 성장이 아니라 **클래스가 부여**한다.

### 숙련 병합 규칙 — `memberRanks(m)` (`state.ts`)
1. 멤버의 클래스 체인(`from` 링크)을 노비스부터 현재 클래스까지 순회.
2. 각 클래스의 `ranks`(기본 랭크), `masters`(=3), `experts`(=2)를 **max 병합**.
3. `masters`/`experts`의 `"LD"` 항목은 멤버가 전직 시 선택한 `m.ld`(`"light"|"dark"`)로 치환.

→ 전직해도 하위 클래스의 숙련은 유지되며, 상위가 더 높으면 덮어쓴다.

## 2. 클래스 트리 1→4→8 (확정 사양, `CLASSES` in `data.ts`)

```
노비스 ─┬─ 워리어 ──────┬─ 기사      M: 날붙이·창·무기숙련        E: 갑옷·방패
        │               └─ 어쌔신    M: 날붙이·투척·함정해체·회피   E: 탐색·몬스터식별
        ├─ 배틀메이지 ──┬─ 성기사(LD) M: 둔기·갑옷·방패            E: 빛or어둠·영혼
        │               └─ 레인저(LD) M: 활·몬스터식별·회피         E: 원소·탐색·빛or어둠
        ├─ 위저드 ──────┬─ 대마법사(LD) M: 원소·빛or어둠           E: 탐색
        │               └─ 드루이드(LD) M: 원소·둔기·탐색          E: 빛or어둠·몬스터식별
        └─ 애콜라이트 ──┬─ 사제(LD)   M: 영혼·빛or어둠             E: 방패
                        └─ 몽크(LD)   M: 영혼·맨손·회피            E: 빛or어둠
```

- `(LD)` 클래스는 `ld: true` — 전직 시 빛/어둠을 선택해 `m.ld`에 저장.
- 전직 조건 — `canClassChange(m)`: tier0은 **Lv3**(→"t1"), tier1은 **Lv6**(→"t2"). tier2는 최종.
- 전직 효과 — `doClassChange`: maxHp +20, maxMp +10, HP/MP 완전 회복.
- 전직 UI는 `town.ts`의 길드 오버레이(`openGuild` → `main`/`memberPage`/`ldPage`).

## 3. 스탯과 성장 (`state.ts`)

### 파생 스탯 — `memberStats(m)`
```
atk      = baseAtk + weapon.atk + round(baseAtk × 0.08 × 무기숙련랭크)
mag      = baseMag
def      = baseDef + armor.def + 갑옷랭크×2 + 방패랭크×2
spd      = baseSpd
evade    = 0.05 × 회피랭크          (최대 15%)
guardCut = 0.06 × 방패랭크          (받는 피해 상시 감소, 최대 18%)
```

### 경험치/레벨 — `expNeed`, `gainExpParty`
- 필요 경험치: `expNeed(lv) = lv² × 22`.
- 승리 시 **파티 전원**이 전체 exp를 획득(분배 없음). 전투불능 멤버도 획득.
- 레벨업: maxHp +13, maxMp +5, baseAtk +2, baseMag +2, baseDef +1, baseSpd +1, HP/MP 완전 회복.

## 4. 전투 규칙 (`battle.ts`)

### 턴 시스템
- 라운드마다 `buildRound()`: 생존 아군+적을 `spd` 내림차순 정렬(동률 시 아군 우선)해 큐 구성. 큐 소진 시 재구성.
- 아군 턴: 방어 상태 해제 → 커맨드 대기. 전투불능(HP 0) 멤버는 스킵.

### 아군 피해 공식 — `execAllyAttack`
```
base = (kind==="mag" ? mag : atk)
dmg  = round(base × pow × rankMult × blessMult × rand(0.9~1.1)) − 적def
        · pierce: 적def의 절반만 적용    · 최소 1
        · crit(a.crit 확률): ×1.7 + "치명타!" 표시
        · drain: 총 피해 × drain 만큼 시전자 HP 회복
        · hits: 회수만큼 반복(다단히트)
```
- `blessMult`: 필드 스킬 [축복] 사용 시 다음 전투 1.25, 아니면 1.0. 전투 시작 시 `G.blessedNext` 소비.
- 기본 공격(`BASIC_ATTACK`)은 pow 1.0, MP 0, rankMult 1 고정.

### 치유 — `onAllyTap` (pendingHeal 분기)
```
회복량 = round(mag × 1.8 × rankMult × pow)
```
- 스킬 치유는 **생존자만** 대상. 전투불능은 치유 물약으로만 부활(+60, `openItemMenu`).

### 적 행동 — `enemyAct`
- 대상: 생존 아군 중 무작위 1인.
- **보스/에픽은 35% 확률로 광역 공격**: 아군 전원에게 `atk × 0.65` 기준 피해.
- 방어 중인 대상: 피해 ×0.45. 방어 선택 시 MP +3. `guardCut`·`evade` 별도 적용.

### 종료 처리
- 승리(`victory`): 골드 합산 + 전원 exp → 전투불능 멤버 **HP 1로 기상** → 심볼전이면 `G.explore.defeated[symbol] = true` → 보스면 `nav.ending()`, 에픽이면 `nav.epicClear()`, 그 외 `nav.explore()`.
- 전멸(`defeat`): 마을에서 부활, **골드 절반 손실**, 전원 완전 회복.
- 도망(`tryFlee`): 일반 몹 전투만, 성공률 60%.

## 5. 탐험 규칙 (`explore.ts`)

### 레인/갈림길
```
WORLD_W = 3400
LANE_Y     = [472, 548, 624]      // 0=안쪽(멀리), 2=바깥(가까이)
LANE_SCALE = [0.82, 0.93, 1.04]   // 깊이감 스케일
JUNCTIONS  = x 760 / 1560 / 2380 / 2960 (각 폭 150)
```
- `tryLane(dir)`: `inJunction(E.x)`일 때만 `E.lane ± 1` (0~2 클램프). 밖에서는 토스트 안내.
- 리더 y는 `LANE_Y[E.lane]`으로 lerp(0.15). 후행 3인은 trail 버퍼에서 `i × TRAIL_GAP(13)` 프레임 뒤 좌표를 따라감.

### 인카운터
- 이동 거리 누적 480px마다 판정. 기본 **42%**, [어둠의 장막] 지속 중 **12%**. `E.x > 700`에서만 발동.
- 조우 그룹 — `randomGroup()`: 파티 최고 레벨 기준 풀(Lv<3: 슬라임·고블린 / Lv<6: +울프·스켈레톤 / Lv6+: 고블린·울프·스켈레톤), 마릿수 2~4.

### 오브젝트 배치 (레인 중요)
| id | x | 레인 | 내용 |
|---|---|---|---|
| portal | 110 | 1 | 마을 귀환 |
| sign | 620 | 1 | 갈림길 힌트 표지판 |
| c1 | 1020 | 0(위) | 상자: 60G + 치유 물약 |
| hid | 1680 | 2(아래) | **숨겨진 상자**(탐색으로 발견, 함정 해체 없으면 전원 22 피해): 240G + 마나 물약 |
| orc | 2100 | 0(위) | [정예] 오크 워로드 + 고블린 |
| ancient | 2620 | 2(아래) | [에픽] — **보스 처치 후에만 생성** |
| lord | 3140 | 1 | [보스] 사전 이벤트 → lord+울프×2. 이벤트에서 "물러난다" 선택 시 `G._fled`로 전투 회피 |

- 심볼 정보: 파티에 몬스터 식별(rank≥1) 보유 시 이름·HP 공개, 없으면 "???" (`partyRank("identify")`).
- 전투 중에도 동일 조건으로 적 HP 수치 표시(`showEnemyHp`).

## 6. 필드 스킬 (`FIELD_SKILLS` in `data.ts`, 핸들러는 `explore.ts`의 `fieldHandlers`)

| id | 요구 스킬 | MP | 효과 |
|---|---|---|---|
| recall | 원소 숙련(2)+ | 5 | 마을로 귀환 |
| bless | 빛 노비스(1)+ | 4 | `G.blessedNext = true` (다음 전투 파티 공격 ×1.25) |
| darkveil | 어둠 숙련(2)+ | 4 | `E.veil = 1400`(보) 동안 인카운터 12% |
| seek | 탐색 노비스(1)+ | 2 | `|E.x − 1680| < 520`이면 숨겨진 상자 발견 |

- 시전자 선정 — `partyFieldSkills()`: 랭크 충족 멤버 중 **현재 MP 최다**인 멤버. 그 멤버의 MP를 소모.

## 7. 검증 (로직 테스트)

클래스 트리/전직/어빌리티/필드스킬은 다음 방식으로 회귀 검증한다 (v0.2에서 전부 통과):

1. `data.ts`·`state.ts`를 임시 폴더로 복사하고 import를 값 전용으로 변환 (`node --experimental-strip-types`는 타입 named import를 지원하지 않음).
2. 최종 8클래스 × (해당 시 ld 지정)에 대해 `memberRanks` 결과의 **달인 집합이 §2 표와 정확히 일치**하는지, 숙련 항목이 rank≥2인지 단언.
3. `classOptions`(노비스 4택, 각 1차→2차 2택), `canClassChange`(Lv3/Lv6), 몽크(어둠)의 `memberAbilities`에 백보신권·생명 흡수 포함, `partyFieldSkills` 시전자 판정을 단언.
