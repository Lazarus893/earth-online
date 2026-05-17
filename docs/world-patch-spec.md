# World Patch System Specification

## Overview
World Patch System 模拟 MMO 游戏的版本更新机制，将真实世界的外部变量引入游戏系统，
让用户感受到"世界在变化，我需要适应"的沉浸感。

---

## Patch Hierarchy

```
Season Update (每季度)
  └── Major Patch (每周)
       └── Daily Patch (每天)
            └── Hotfix (实时/事件驱动)
```

---

## Data Sources & Modules

### Weather Module
**数据源**: OpenWeather API / 系统天气
**更新频率**: 每日早晨 + 显著变化时
**影响维度**: Physical, Energy

**规则引擎**:
```json
{
  "sunny_outdoor_bonus": {
    "condition": "weather.main == 'Clear' && temp >= 15 && temp <= 30",
    "effect": { "physical_exp_mult": 1.2, "energy_exp_mult": 1.1 },
    "message": "晴朗好天气，户外活动经验 +20%"
  },
  "rain_indoor_shift": {
    "condition": "weather.main == 'Rain'",
    "effect": { "task_shift": "outdoor_to_indoor" },
    "message": "下雨了，户外任务自动切换为室内替代方案"
  },
  "extreme_heat_warning": {
    "condition": "temp > 35",
    "effect": { "physical_exp_mult": 0.8, "caution_flag": true },
    "message": "高温预警：建议避免户外高强度运动"
  },
  "cold_energy_drain": {
    "condition": "temp < 5",
    "effect": { "energy_decay_mult": 1.5 },
    "message": "寒冷天气消耗额外精力，注意保暖和补充能量"
  }
}
```

### Economy Module
**数据源**: 财经 API / 新闻搜索
**更新频率**: 每周一次 (Major Patch)
**影响维度**: Finance, Career

**规则引擎**:
```json
{
  "bull_market": {
    "condition": "weekly_market_change > 2%",
    "effect": { "finance_task_priority": "high", "investment_study_bonus": 1.3 },
    "message": "市场向好，金融学习任务经验加成 +30%"
  },
  "bear_market": {
    "condition": "weekly_market_change < -3%",
    "effect": { "finance_task_type": "defensive", "risk_awareness_bonus": 1.2 },
    "message": "市场波动，切换为防御型理财学习"
  },
  "industry_boom": {
    "condition": "sector_news_sentiment > 0.7",
    "effect": { "career_skill_tree_unlock": "new_branch" },
    "message": "行业利好！新的技能学习路径已解锁"
  }
}
```

### News/Tech Module
**数据源**: Web Search / RSS
**更新频率**: 每日
**影响维度**: Career, Social

**规则引擎**:
```json
{
  "new_tech_release": {
    "condition": "tech_news.contains('major_release')",
    "effect": { "career_new_task": "learn_new_tech", "exp_bonus": 1.2 },
    "message": "新技术发布！学习任务已加入队列"
  },
  "industry_event": {
    "condition": "event.type == 'conference' && event.date.within(7days)",
    "effect": { "social_task_suggestion": "networking" },
    "message": "行业活动即将举办，考虑参加拓展人脉？"
  }
}
```

### Calendar Module
**数据源**: 系统日历 / 节假日 API
**更新频率**: 每日 + 事件触发
**影响维度**: All

**规则引擎**:
```json
{
  "holiday": {
    "condition": "is_holiday == true",
    "effect": { "task_reduction": 0.5, "social_bonus": 1.5 },
    "message": "假期模式：任务减半，社交经验翻倍"
  },
  "monday": {
    "condition": "day_of_week == 1",
    "effect": { "career_priority": "high", "plan_review": true },
    "message": "新的一周开始，系统已为你规划本周重点"
  },
  "season_change": {
    "condition": "month in [3,6,9,12] && day <= 7",
    "effect": { "season_update": true, "full_review": true },
    "message": "Season Update! 季度更新已生成，请查看新版本内容"
  }
}
```

---

## Patch Note Generation

### Template
```markdown
═══════════════════════════════════════════════
  🌍 EARTH ONLINE - Patch {version}
  📅 {date} | 📍 {location}
═══════════════════════════════════════════════

{modules_content}

───────────────────────────────────────────────
[PLAYER STATS]
• 连续活跃: {streak} 天 (×{streak_mult})
• 本周完成: {weekly_tasks}/{weekly_total} 任务
• 下次 Major Patch: {next_major_patch_date}
═══════════════════════════════════════════════
```

### Version Numbering
```
Format: v{year}.{month}.{day}.{patch_number}
Example: v2026.05.12.1 (2026年5月12日第1个patch)

Season Update: v2026.Q2 (大版本号)
```

---

## Impact Propagation

当 World Patch 生成后，影响如何传播到五层体系：

```
World Patch Generated
  │
  ├─→ STATUS: 修改 exp_multiplier, decay_rate
  │
  ├─→ GOALS: 重新评估优先级权重
  │     (例：暴雨天 → 体力相关目标权重暂降)
  │
  ├─→ PLANS: 调整时间线和里程碑
  │     (例：假期 → 计划自动延期)
  │
  ├─→ TASKS: 具体任务替换或调整
  │     (例：雨天 → 户外跑步改为室内HIIT)
  │
  └─→ ACTIONS: AI服务调整输出内容
        (例：经济数据变化 → 调整理财建议方向)
```

---

## Implementation Priority

1. **Phase 1**: Weather Module (最直接影响日常)
2. **Phase 2**: Calendar Module (节假日和周规律)
3. **Phase 3**: News/Tech Module (职业发展相关)
4. **Phase 4**: Economy Module (需要 Finance 维度解锁后)
