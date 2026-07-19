# 02 — 게임 시스템과 공식

모든 공식은 코드와 1:1 대응. 출처 파일을 함께 표기한다.

## 1. 스킬 숙련 시스템 (`data.ts`, `state.ts`)

- 스킬 **16종**, 4계열: 물리(날붙이·둔기·창·맨손·활·투척) / 방어(갑옷·회피·방패) / 마법(원소·영혼·빛·어둠) / 보조(함정·식별·인지).
- 숙련 3단계: `RANK_NAME = ["—","노비스","숙련","달인"]`, 위력 배율 `RANK_MULT = [0, 1.0, 1.55, 2.3]`.
- 숙련은 개별 성장이 아니라 **클래스가 부여**하며, 캐릭터 생성 시 고른 추가 기술 2개(`bonusSkills`)가 랭크 1로 더해진다.

### 숙련 병합 규칙 — `memberRanks(m)` (`state.ts`)
1. 멤버의 클래스 체인(`from` 링크)을 기초 클래스(파이터/스콜라)부터 현재 클래스까지 순회.
2. 각 클래스의 `ranks`(기본 랭크), `masters`(=3), `experts`(=2)를 **max 병합**.
3. `masters`/`experts`의 `"LD"` 항목은 멤버가 전직 시 선택한 `m.ld`(`"light"|"dark"`)로 치환.
4. 마지막으로 `m.bonusSkills`(생성 시 선택 2종)를 랭크 1로 max 병합.

→ 전직해도 하위 클래스의 숙련은 유지되며, 상위가 더 높으면 덮어쓴다.

## 2. 클래스 트리 2→4→8 (확정 사양, `CLASSES` in `data.ts`)

캐릭터 생성에서 파이터/스콜라 중 선택. 1차 전직은 기초 클래스에 따라 두 갈래로 제한된다.

```
파이터 ─┬─ 소드맨 ──────┬─ 소드마스터  M: 날붙이·창               E: 갑옷·방패
        │               └─ 어쌔신      M: 날붙이·투척·함정·회피    E: 인지·식별
        └─ 스펠소드 ────┬─ 성기사(LD)  M: 둔기·갑옷·방패          E: 빛or어둠·영혼
                        └─ 레인저(LD)  M: 활·식별·회피            E: 원소·인지·빛or어둠
스콜라 ─┬─ 메이지 ──────┬─ 대마법사(LD) M: 원소·빛or어둠          E: 인지
        │               └─ 드루이드(LD) M: 원소·둔기·인지         E: 빛or어둠·식별
        └─ 애콜라이트 ──┬─ 사제(LD)    M: 영혼·빛or어둠           E: 방패
                        └─ 몽크(LD)    M: 영혼·맨손·회피          E: 빛or어둠
```

- 기초 클래스 기본 기술: 파이터 = 날붙이1·갑옷1, 스콜라 = 원소1·영혼1.
- `(LD)` 클래스는 `ld: true` — 전직 시 빛/어둠을 선택해 `m.ld`에 저장.
- 전직 조건 — `canClassChange(m)`: tier0은 **Lv3**(→"t1"), tier1은 **Lv6**(→"t2"). tier2는 최종.
- 전직 효과 — `doClassChange`: maxHp +20, maxMp +10, HP/MP 완전 회복, 외형색(`color`/`accent`)이 새 클래스 값으로 변경.
- 전직 UI는 `town.ts`의 길드 오버레이(`openGuild` → `main`/`memberPage`/`ldPage`).

## 3. 능력치와 성장 (`state.ts`)

### 기본 능력치 6종 (`ATTRS` in `data.ts`, 생성 시 분배)
| id | 이름 | 효과 |
|---|---|---|
| might | 근력 | 물리 공격력 (소지 무게는 미구현) |
| int | 지능 | 법사형(원소·빛·어둠) 마법 공격, MP |
| wit | 지혜 | 사제형(영혼) 마법 공격·치유, MP (저주·공포 저항은 미구현) |
| vital | 체력 | HP, 물리 방어 (중독·질병 저항은 미구현) |
| agi | 민첩 | 행동 순서, 회피 |
| fortune | 운 | 치명타율, 전투 후 희귀 아이템 판정 |

- 생성 규칙: 전 능력치 기본 10, 분배 포인트 10, 범위 8~18 (`ATTR_BASE/MIN/MAX`, `CREATE_POINTS`).
- 시작 HP/MP: `maxHpOf = 40 + vital×3`, `maxMpOf = 4 + int + wit`.

### 파생 스탯 — `memberStats(m)`
> **유효 능력치** `effectiveAttrs(m)` = 기본 능력치 + 장비(목걸이·반지·서클릿 등) `attrs` 보너스 합.
> 아래 공식의 `might/int/…`는 모두 **유효 능력치**를 쓴다 → 장신구가 파생 스탯 전부를 강화한다.
```
atk      = might + weaponAtk(m)      weaponAtk = 오른손+왼손(듀얼윌드) atk 합, 0이면 맨손랭크×3
magInt   = int                       (원소·빛·어둠 계열 기반)
magWit   = wit                       (영혼 계열·치유 기반, magicBase()로 선택)
def      = floor(vital/2) + equipDefense(m) + 갑옷랭크×2 + 방패랭크×2   (전 슬롯 def 합)
spd      = agi
evade    = 0.05 × 회피랭크 + 0.01 × max(0, agi−10)
crit     = 0.01 × fortune            (모든 공격의 치명타율에 가산)
guardCut = 0.06 × 방패랭크           (받는 피해 상시 감소, 최대 18%)
```

### 장비 슬롯 9종 (`defs/equip.ts`, `Member.equip`)
- `equip: Partial<Record<EquipSlot, Equipped>>` — 슬롯: **오른손(mainHand)·왼손(offHand)·투구·갑옷·신발·망토·목걸이·반지×2**. 빈 슬롯은 미장착(오른손 비면 `equippedWeapon`이 맨손 `FISTS`=때리기·근접·atk0 반환).
- **양손무기**(`twoHanded`): mainHand 장착 시 offHand 자동 해제(반대로 offHand를 채우면 양손무기 해제). 활은 양손·원거리.
- **듀얼윌드**: 왼손에 무기 → `weaponAtk`가 오른손+왼손 합산.
- **반지 자동칸**: `slot:"ring"` 구매 시 빈 ring1→ring2, 둘 다 차면 ring1 교체. 좌우 차이 없음.
- **스탯 부여**: `Equipped.attrs`(능력치, 유효 능력치로 반영)·`def`(방어, 전 슬롯 합)·`res`(저항, 전 슬롯 곱연산). 무기는 `atk/wtype/reach`.
- 장착: `equipGear(m, gearDef)` (슬롯 배치·양손·반지칸 처리, 장착 슬롯 반환). 상점 구매가 이 함수를 호출.

### 랜덤 드랍 · 희귀도 · 감정 · 인벤토리 (`defs/loot.ts`, `Member`/`GameState`)
- **희귀도** `Rarity` 4단계 — 평범(회색·접사0)·마법(파랑·1)·희귀(노랑·2)·유물(보라·3). `RARITY_META`에 색·접사수·`idReq`(감정 요구 식별 랭크).
- **접사(인챈트)** `AFFIXES` — M&M7식. 한국어 관형어(힘의·현자의·전사의·예리한·불수호의…), 대상 슬롯군(weapon/armor/any). 희귀도만큼 서로 다른 접사를 뽑아 `atk/def/attrs/res`를 변형하고 이름 앞에 붙인다("전사의 파괴의 룬 블레이드").
- **생성** `generateGear(base, rarity, rng)` → `OwnedGear`(개체 `uid`·`rarity`·`identified`·`affixes`·`price`). rng 주입으로 결정적 테스트.
- **드랍** `rollDrop(tier, fortune, rng)` — 티어별 확률(일반 0.12 … 보스 1.0)·희귀도 가중치. 기반은 `basePool(tier)`(적 티어 이하 가격밴드). explore `killEnemy`가 `rollDropToBag(def.tier)`로 처치 시 판정 → **가방**에 보관.
- **인벤토리** `GameState.bag: OwnedGear[]` — 미장착/미확인 장비. `equipFromBag(m, uid)`는 장착하며 교체·양손 해제된 기존 장비를 `equippedToOwned`로 **가방에 회수**(분실 없음). `sellGear`(가치 40%).
- **식별(감정)** — "식별" 스킬에 실효 부여. 마법 이상은 미확인으로 드랍("미확인 {슬롯}", 장착 불가). `identifyGear(uid)`는 `partyRank("identify") ≥ idReq`면 성공(마법=노비스·희귀=전문가·유물=달인). 획득 시 랭크가 충분하면 `addDrop`이 자동 감정.
- UI: `hud.openBagMenu`(모험 수첩 "가방" 버튼) — 감정/장착/팔기·페이지네이션. **zIndex 66**(모험수첩 60 위·pickMember 70 아래 — 장착 멤버선택이 위로 뜨도록).

### 경험치/레벨 — `expNeed`, `gainExpParty`
- 필요 경험치: `expNeed(lv) = lv² × 22`.
- 승리 시 **파티 전원**이 전체 exp를 획득(분배 없음). 전투불능 멤버도 획득.
- 레벨업: maxHp +10, maxMp +3, HP/MP 완전 회복. **능력치는 자동으로 오르지 않고** 배분 포인트를 지급 — 능력치 포인트 `LEVEL_AP`(6), 스킬 포인트 `LEVEL_SP`(2)를 `apUnspent`/`spUnspent`에 적립.

### 성장 배분 (모험 수첩 → 성장 메뉴, `openGrowthMenu`)
- **능력치 배분** — `spendAttrPoint(m, attr)`: AP 1점당 능력치 +1. 체력=maxHp +3, 지능·지혜=maxMp +1 즉시 반영(HP/MP도 함께 +).
- **스킬 훈련** — `spendSkillPoint(m, skill)`: SP로 스킬 랭크를 개별 상승. 상한 **전문가(2)**(`TRAIN_CAP`) — 달인(3)은 클래스 전용. 비용 = 목표 랭크(노비스 1·전문가 2, `trainCost`). `trainableNext`가 현재 유효 랭크(클래스+보너스+훈련) 기준으로 다음 단계·비용 판정.
- 훈련 랭크는 `m.trained`에 저장되고 `memberRanks`가 클래스 부여분과 **max 병합** — 파이터가 원소를 훈련해 화염구를 얻는 식의 크로스빌드가 가능(달인·rank3 어빌리티는 클래스로만).

## 4. 전투 규칙

> **실제 게임 전투는 `scenes/explore.ts`의 1인칭 그리드 전투 하나뿐이다.** 장면은 이동·어그로·입력·연출을 담당하고, 공격·방어·회복·아이템·상태이상 판정은 `core/battle-engine.ts`의 그리드 어댑터를 사용한다. 독립 전투 테스트와 실제 플레이가 같은 내부 판정 메서드를 공유한다.

### 명중 굴림 (`core/dice`, `core/formulas`)
- **기술·마법(어빌리티, `a.id !== ""`)은 명중 굴림에서 제외 — 항상 명중한다.** 오직 **기본 공격**(`BASIC_ATTACK`)만 d20 명중 굴림(d20+명중보정 vs 적 회피도, 자연20 치명·자연1 자동 실패)을 한다.
- 치명타: 기본 공격은 자연20 또는 확률(`a.crit + s.crit`), 기술·마법은 확률로만. `sureCrit`(완벽한 일격)은 자동 명중+치명.

### 아군 피해 공식 — `rollAllyHit`
```
base = (kind==="mag" ? magicBase(s, skill) : atk)   // 영혼=지혜, 그 외 마법=지능
dmg  = round(base × pow × rankMult × blessMult × rand(0.9~1.1)) − 적def
        · pierce: 적def의 절반만 적용    · 최소 1    · bonus(강타): 방어 후 가산
        · crit: ×1.7 + "치명타!" 표시
        · 저항/약점: 최종 피해에 타입 배율 (아래 데미지 타입·저항 참고)
        · drain: 총 피해 × drain 만큼 시전자 HP 회복    · hits: 회수만큼 반복
```
- `blessMult`: 필드 스킬 [축복] 사용 시 다음 전투 1.25, 아니면 1.0. 전투 시작 시 `G.blessedNext` 소비.
- 기본 공격(`BASIC_ATTACK`)은 pow 1.0, MP 0, rankMult 1 고정.

### 진형 — 전열/후열 (`Member.back`, `attackReach`, `enemyMelee`)
- 파티는 전열/후열로 나뉜다(기본 앞 2명 전열·뒤 2명 후열). `모험 수첩`에서 멤버별 토글(**전열 최소 1명** 강제).
- **적 근접 공격**(공격 타입이 베기/찌르기/때리기 = `enemyMelee`)은 **전열만** 노린다 — 전열이 전멸해야 후열이 노출. 원소·영혼 등 마법 타입 공격과 보스 광역은 후열까지 닿는다.
- **아군 공격 사거리**(`attackReach`): 마법·회복 = 원거리(시야), 물리는 기본 공격=무기 사거리, 그 외 물리 스킬은 활·투척만 원거리. **후열은 근접 공격 불가** — 활(원거리 무기)·투척·마법으로만 공격.
- 전술 의미: 방패·근접 딜러는 전열에서 적을 받아내고, 궁수·법사는 후열에서 안전하게 딜. 활(`사냥 활`·`장궁`)은 후열 딜을 여는 유일한 물리 수단.

### 데미지 타입·저항 (`defs/damage.ts`)

모든 공격은 **10종 데미지 타입** 중 하나를 가진다.

| 계열 | 타입 |
|---|---|
| 물리 | 베기(slash·칼/단검) · 찌르기(pierce·창/활/투척) · 때리기(bludgeon·둔기/맨손) |
| 원소 | 땅(earth) · 불(fire) · 바람(wind) · 물(water) |
| 마법 | 영혼(spirit) · 빛(light) · 어둠(dark) |

- 타입 해석 — `attackDamageType(ability, weaponType)`:
  1. 어빌리티에 `dtype`이 있으면 그대로(원소 주문은 세부 속성을 여기서 지정: 화염구=불, 연쇄번개=바람, 메테오=땅).
  2. 없고 마법이면 스킬 계열(영혼/빛/어둠)이 곧 타입.
  3. 물리면 **장착 무기 계열**(`equippedWeapon(m).wtype`, 오른손 기준·맨손=때리기)이 타입. 상점 무기가 3계열(검=베기, 창·활=찌르기, 망치·메이스=때리기)로 갖춰져 실전에서 셋 다 등장.
- 저항 배율(공용) — `Partial<Record<DamageType, number>>`(미지정 1.0). `resistMult` 조회, `resistBand` 분류: **≤0 무효 · <1 저항 · 1 보통 · >1 약점**.

**적 측(아군 공격 → 적):**
- 적 정의의 `res`로 배율. `rollAllyHit` 최종단(방어·강타·치명 이후)에 곱한다. 밴드는 `HitRoll.resist` → `hit` 이벤트 → 전투 씬 "약점!/저항/무효" 배너·색.
- 대표 상성: 슬라임=때리기·불 약점/베기·찌르기 저항, 냉기 망령=불·빛·둔기 약점/**어둠 무효**·물 저항, 집게버섯(정예)=**불 ×2**, 숲의 군주=물·빛 약점/불·바람 저항, 고대 정령=물리·원소 전부 저항/**영혼·어둠에만 약점**.

**아군 측(적 공격 → 아군):**
- 적 정의의 `atkType`(미지정 때리기)이 적 공격의 타입. 예: 냉기 망령=물, 숲의 군주=불, 고대 정령=영혼.
- 아군 저항 `memberResist(m)` = **직업 고유 `res` × 전 장비 슬롯 `res`(곱연산)**. 예: 대마법사=불·바람 0.8, 몽크=영혼 0.7, 성기사=어둠 0.7, 룬 아머(갑옷)=4원소 0.85, 원소 저항 망토=4원소 0.9, 수호의 부적(목걸이)=어둠 0.85.
- `rollEnemyHit` 최종단에 곱한다. 밴드는 `hit` 이벤트로 흘러 아군 노드 위에 동일 배너 표시(탐험 그리드 전투는 로그에 `-N 약점!/저항/무효`).

### 상태이상 (`core/statuses.ts`)

기존 `guard·cover·taunt·defdown·silence`에 더해 **4종 제어기**를 제공한다. 모든 전투 상태 판정은 `core/battle-engine.ts`와 `core/statuses.ts`를 통해 처리한다.

| 상태 | 효과 | 부여 예 |
|---|---|---|
| 중독(poison) | 자기 턴 시작마다 `power` 고정 피해(방어·저항 무시) | 맹독(dark), 독날(thrown), 슬라임 |
| 수면(sleep) | 행동 불가. **피해를 받으면 즉시 해제** | 잠재우기(spirit2), 고대 정령 |
| 마비(paralyze) | 행동 불가. 피해로는 안 풀림 | 성스러운 속박(light2), 냉기 망령 |
| 공포(fear) | 자신의 공격이 **불리(disadvantage)**로 굴려짐 | 공포(dark2), 숲의 군주 |

- 지속시간 — `StatusInstance.turns`. 배틀엔진은 유닛 턴 단위, 탐험은 **세계 턴 단위**(`statusUpkeep`)로 감소(`tickDurations`).
- 부여 — 아군 기술은 `applyOnHitStatuses`(엔진)/`applyAllyInflict`(탐험)에서 **내성 DC = 8 + 시전 능력치 수정치 + 랭크**로 판정. 적은 `EnemyDef.inflict{status,chance,save,turns,power?}`로 명중 시 확률 부여, 아군이 `enemyInflictDC = 11 + tier`를 굴려 저항.
- 헬퍼: `poisonPower·incapacitatedBy·isFeared·wakeOnDamage·tickDurations`. 배너/색은 `STATUS_NAME·STATUS_COLOR`, 탐험은 적 정보 패널에 `[중독·수면]` 태그로 상시 표시.
- 그리드 전투는 `BattleEngine.gridUpkeep/gridOffense/gridEnemyAct`를 사용한다. `explore` 장면은 반환된 이벤트를 피해 숫자·로그·보상 연출로 변환한다.

### 치유 — `onAllyTap` (pendingHeal 분기)
```
회복량 = round(magicBase(s, skill) × 1.8 × rankMult × pow)   // 치유는 영혼 계열 → 지혜 기반
```
- 스킬 치유는 **생존자만** 대상. 전투불능은 치유 물약으로만 부활(+60, `openItemMenu`).

### 적 행동 — `enemyAct`
- 대상: 생존 아군 중 무작위 1인.
- **보스/에픽은 35% 확률로 광역 공격**: 아군 전원에게 `atk × 0.65` 기준 피해.
- 방어 중인 대상: 피해 ×0.45. 방어 선택 시 MP +3. `guardCut`·`evade` 별도 적용.

### 종료 처리
- 승리(`victory`): 골드 합산 + 전원 exp → 운 판정(`partyFortune() × 0.012` 확률로 물약 1개 획득) → 전투불능 멤버 **HP 1로 기상** → 심볼전이면 `G.explore.defeated[symbol] = true` → 보스면 `nav.ending()`, 에픽이면 `nav.epicClear()`, 그 외 `nav.explore()`.
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
| hid | 1680 | 2(아래) | **숨겨진 상자**(탐색으로 발견, 함정(trapfinding) 스킬 없으면 전원 22 피해): 240G + 마나 물약 |
| orc | 2100 | 0(위) | [정예] 오크 워로드 + 고블린 |
| ancient | 2620 | 2(아래) | [에픽] — **보스 처치 후에만 생성** |
| lord | 3140 | 1 | [보스] 사전 이벤트 → lord+울프×2. 이벤트에서 "물러난다" 선택 시 `G._fled`로 전투 회피 |

- 심볼 정보: 파티에 식별(rank≥1) 보유 시 이름·HP 공개, 없으면 "???" (`partyRank("identify")`).
- 전투 중에도 동일 조건으로 적 HP 수치 표시(`showEnemyHp`).

## 6. 필드 스킬 (`FIELD_SKILLS` in `data.ts`, 핸들러는 `explore.ts`의 `fieldHandlers`)

| id | 요구 스킬 | MP | 효과 |
|---|---|---|---|
| recall | 원소 숙련(2)+ | 5 | 마을로 귀환 |
| bless | 빛 노비스(1)+ | 4 | `G.blessedNext = true` (다음 전투 파티 공격 ×1.25) |
| darkveil | 어둠 숙련(2)+ | 4 | `E.veil = 1400`(보) 동안 인카운터 12% |
| seek | 인지 노비스(1)+ | 2 | `|E.x − 1680| < 520`이면 숨겨진 상자 발견 |

- 시전자 선정 — `partyFieldSkills()`: 랭크 충족 멤버 중 **현재 MP 최다**인 멤버. 그 멤버의 MP를 소모.

## 7. 검증 (로직 테스트)

클래스 트리/전직/어빌리티/필드스킬은 다음 방식으로 회귀 검증한다 (v0.2에서 전부 통과):

1. `data.ts`·`state.ts`를 임시 폴더로 복사하고 import를 값 전용으로 변환 (`node --experimental-strip-types`는 타입 named import를 지원하지 않음).
2. 최종 8클래스 × (해당 시 ld 지정)에 대해 `memberRanks` 결과의 **달인 집합이 §2 표와 정확히 일치**하는지, 숙련 항목이 rank≥2인지 단언.
3. `classOptions`(기초→1차 2택, 각 1차→2차 2택), `canClassChange`(Lv3/Lv6), 몽크(어둠)의 `memberAbilities`에 백보신권·생명 흡수 포함, `partyFieldSkills` 시전자 판정을 단언.
