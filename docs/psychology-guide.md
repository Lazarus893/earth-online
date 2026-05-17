# Psychology Guide - Onboarding Design

## Design Philosophy

不直接询问用户"给自己的XX打几分"，而是通过场景化、情境化的问题间接评估。
参考心理学测量工具的设计理念：MBTI、Big Five、盖洛普优势识别。

---

## Core Principles

### 1. 间接评估 (Indirect Assessment)
- 不问"你的体力几分" → 问"上次爬楼梯到几楼会喘？"
- 不问"你的精力好吗" → 问"下午3点你通常在做什么？"
- 用行为描述代替自我评价，减少社会期望偏差

### 2. 场景代入 (Scenario Immersion)
- 使用"如果..."句式创造假设场景
- 让用户在情境中做选择，而非抽象评判
- 增加趣味性，降低"被测试"的感觉

### 3. 多维映射 (Multi-dimensional Mapping)
- 每个问题影响 2-3 个维度
- 避免一对一对应（防止用户猜测"正确答案"）
- 通过交叉验证提高评估准确性

### 4. 渐进深入 (Progressive Depth)
- 前2题: 破冰，简单轻松
- 中间4题: 核心评估
- 最后2题: 确认和微调

---

## Question Bank

### Opening Questions (破冰)

**Q1: 角色创建**
```
"欢迎来到 Earth Online。先来看看你现在的角色状态。
一般工作日的早晨，闹钟响后你的第一反应是？"

A) 立刻起床，脑子里已经在排今天的计划 → Career+2, Energy+1
B) 赖床5-10分钟，然后挣扎起来 → Energy-1, Physical±0
C) 会先看手机消息/社交媒体 → Social+1, Energy-1
D) [自定义输入] → GLM 分析
```

**Q2: 能量扫描**
```
"系统正在扫描你的基础属性...
最近一周，到了下午3点左右，你通常的状态是？"

A) 还挺有精神的，正在高效工作 → Energy+2, Career+1
B) 开始有点疲惫，需要咖啡续命 → Energy-1, Physical-1
C) 已经在摸鱼了，等下班 → Energy-2, Career-1
D) 下午通常在运动或活动 → Physical+2, Energy+1
```

### Core Assessment (核心评估)

**Q3: 体力维度深探**
```
"检测到物理属性波动...
上一次让你觉得'身体真不错'是什么时候？"

A) 就最近！每周都有运动 → Physical+3
B) 大概一两个月前？ → Physical+1
C) 记不太清了... → Physical-1
D) 今天早上还做了运动 → Physical+3, Energy+1
```

**Q4: 职业维度深探**
```
"正在加载技能树...
如果有人问'你最近在学什么'，你会说？"

A) 正在系统学习某个新技能 → Career+3
B) 零散地看一些感兴趣的内容 → Career+1
C) 工作上用到什么学什么 → Career+1
D) 最近没怎么学新东西 → Career-1
```

**Q5: 精力维度深探**
```
"精神力扫描中...
最近一次全神贯注做一件事超过2小时，是在做什么？"

A) 工作中的某个项目 → Career+1, Energy+2
B) 玩游戏/看剧/娱乐 → Energy+1
C) 学习或创作 → Career+2, Energy+2
D) 好像很久没有那种状态了 → Energy-2
```

**Q6: 生活节奏评估**
```
"正在分析生活模式...
你觉得自己现在的生活节奏？"

A) 很规律，有固定的作息和习惯 → Physical+1, Energy+1, Career+1
B) 大体规律，偶尔打乱 → Physical±0, Energy±0
C) 比较混乱，想改但没动力 → Physical-1, Energy-1
D) 自由奔放，享受不确定性 → Social+1, Energy±0
```

### Confirmation & Calibration (确认校准)

**Q7: 优先级确认**
```
"属性扫描即将完成...
如果接下来的30天你只能专注提升一个方面，你会选？"

A) 身体素质和运动习惯 → Physical priority
B) 精力管理和专注力 → Energy priority
C) 职业技能和工作能力 → Career priority
D) [自定义] → GLM 分析优先级
```

**Q8: 难度偏好**
```
"最后一个问题，设置游戏难度...
你喜欢的挑战节奏是？"

A) 稳步推进，每天一点进步就好 → difficulty: easy
B) 适度挑战，偶尔来个大目标 → difficulty: medium
C) 高强度冲刺，快速看到结果 → difficulty: hard
D) 随心所欲，不要太多压力 → difficulty: casual
```

---

## Scoring Algorithm

### Dimension Score Calculation
```python
def calculate_initial_scores(answers):
    scores = {
        'physical': 50,   # 基准分 50
        'energy': 50,
        'career': 50,
        'social': 50,     # locked, but still assessed
        'finance': 50     # locked, but still assessed
    }
    
    for answer in answers:
        for dimension, delta in answer.impacts.items():
            scores[dimension] += delta * 5  # 每个 delta 单位 = 5分
    
    # Clamp to [10, 90] - 不允许满分或过低
    for dim in scores:
        scores[dim] = clamp(scores[dim], 10, 90)
    
    return scores
```

### GLM Integration for Custom Inputs
当用户选择自定义输入时：
1. 将输入文本发送给 GLM
2. Prompt: "分析以下文本在 [physical, energy, career, social, finance] 五个维度上的倾向性，返回 -3 到 +3 的分数"
3. 将 GLM 返回的分数应用到对应维度

---

## Post-Onboarding Flow

### 结果展示
```
"角色创建完成！这是你当前的状态：

  ⚔ Physical: ████████░░ 65/100
  ⚡ Energy:   ██████░░░░ 45/100  
  🎯 Career:  █████████░ 72/100
  🔒 Social:  [待解锁]
  🔒 Finance: [待解锁]

系统建议优先关注：精力管理
因为精力是所有行动的基础燃料。

准备好开始你的第一个目标了吗？"

[⚡ 提升精力] [⚔ 强化体能] [🎯 冲刺职业] [🎲 让系统推荐]
```

### Goals Generation
基于初始状态，AI 自动生成第一批 Goals：
- 最低分维度: 生成 2 个改善目标
- 最高分维度: 生成 1 个进阶目标
- 用户确认后，自动展开为 Plans → Tasks

---

## Psychological Techniques Used

| 技术 | 应用场景 | 效果 |
|------|----------|------|
| Anchoring Effect | 初始分数设为50 | 避免极端自评 |
| Choice Architecture | 选项排列顺序随机化 | 减少首选偏差 |
| Gamification Framing | "属性扫描"而非"自评" | 降低防御心理 |
| Progressive Disclosure | 渐进式深入 | 保持参与度 |
| Positive Framing | 用"提升"而非"问题" | 激发动力 |
| Commitment Device | 让用户选择优先级 | 增加后续执行力 |
| Social Proof | (未来)展示同类用户数据 | 建立参照系 |
