import type { DimensionKey } from '../App'

export interface QuestionOption {
  id: string
  text: string
  impacts: Partial<Record<DimensionKey, number>>
}

export interface Question {
  id: string
  phase: 'opening' | 'core' | 'calibration'
  systemMessage: string
  questionText: string
  options: QuestionOption[]
  allowCustom: boolean
  /** 自由文本输入的 placeholder */
  freeTextPrompt?: string
  /** 自由文本输入的提示语 */
  freeTextHint?: string
}

export const QUESTIONS: Question[] = [
  // ===== Opening (系统校准) =====
  {
    id: 'q1',
    phase: 'opening',
    systemMessage: '正在扫描宿主基础生物节律...',
    questionText: '一般工作日的早晨，闹钟响后你的第一反应是？',
    allowCustom: true,
    freeTextPrompt: '或者描述你真实的早晨状态...',
    freeTextHint: '比如：赖到最后一秒才冲出门',
    options: [
      {
        id: 'q1a',
        text: '立刻起床，脑子里已经在排今天的计划',
        impacts: { career: 2, energy: 1 },
      },
      {
        id: 'q1b',
        text: '赖床5-10分钟，然后挣扎起来',
        impacts: { energy: -1 },
      },
      {
        id: 'q1c',
        text: '会先看手机消息/社交媒体',
        impacts: { social: 1, energy: -1 },
      },
    ],
  },

  // ===== Core Assessment (核心属性检测) =====
  {
    id: 'q2',
    phase: 'core',
    systemMessage: '扫描宿主物理属性...',
    questionText: '上一次让你觉得"身体真不错"是什么时候？',
    allowCustom: true,
    freeTextPrompt: '或者说说你最近的身体感受...',
    freeTextHint: '比如：每天跑步5公里，状态不错',
    options: [
      {
        id: 'q2a',
        text: '就最近！每周都有运动',
        impacts: { physical: 3 },
      },
      {
        id: 'q2b',
        text: '大概一两个月前？',
        impacts: { physical: 1 },
      },
      {
        id: 'q2c',
        text: '记不太清了...',
        impacts: { physical: -1 },
      },
      {
        id: 'q2d',
        text: '今天早上还做了运动',
        impacts: { physical: 3, energy: 1 },
      },
    ],
  },
  {
    id: 'q3',
    phase: 'core',
    systemMessage: '加载宿主技能树数据...',
    questionText: '如果有人问"你最近在学什么"，你会说？',
    allowCustom: true,
    options: [
      {
        id: 'q3a',
        text: '正在系统学习某个新技能',
        impacts: { career: 3 },
      },
      {
        id: 'q3b',
        text: '零散地看一些感兴趣的内容',
        impacts: { career: 1 },
      },
      {
        id: 'q3c',
        text: '工作上用到什么学什么',
        impacts: { career: 1 },
      },
      {
        id: 'q3d',
        text: '最近没怎么学新东西',
        impacts: { career: -1 },
      },
    ],
  },
  {
    id: 'q4',
    phase: 'core',
    systemMessage: '分析宿主生活模式稳定性...',
    questionText: '你觉得自己现在的生活节奏？',
    allowCustom: false,
    options: [
      {
        id: 'q4a',
        text: '很规律，有固定的作息和习惯',
        impacts: { physical: 1, energy: 1, career: 1 },
      },
      {
        id: 'q4b',
        text: '大体规律，偶尔打乱',
        impacts: {},
      },
      {
        id: 'q4c',
        text: '比较混乱，想改但没动力',
        impacts: { physical: -1, energy: -1 },
      },
      {
        id: 'q4d',
        text: '自由奔放，享受不确定性',
        impacts: { social: 1 },
      },
    ],
  },

  // ===== Calibration (最终校准) =====
  {
    id: 'q5',
    phase: 'calibration',
    systemMessage: '属性校准即将完成，需要宿主确认优先发展方向...',
    questionText: '如果接下来的30天你只能专注提升一个方面，你会选？',
    allowCustom: true,
    freeTextPrompt: '或者描述你最想改变的事...',
    freeTextHint: '比如：想养成每天阅读的习惯',
    options: [
      {
        id: 'q5a',
        text: '身体素质和运动习惯',
        impacts: { physical: 1 },
      },
      {
        id: 'q5b',
        text: '精力管理和专注力',
        impacts: { energy: 1 },
      },
      {
        id: 'q5c',
        text: '职业技能和工作能力',
        impacts: { career: 1 },
      },
    ],
  },
  {
    id: 'q6',
    phase: 'calibration',
    systemMessage: '最终参数：设定系统难度系数...',
    questionText: '你喜欢的挑战节奏是？',
    allowCustom: false,
    options: [
      {
        id: 'q6a',
        text: '稳步推进，每天一点进步就好',
        impacts: {},
      },
      {
        id: 'q6b',
        text: '适度挑战，偶尔来个大目标',
        impacts: {},
      },
      {
        id: 'q6c',
        text: '高强度冲刺，快速看到结果',
        impacts: {},
      },
      {
        id: 'q6d',
        text: '随心所欲，不要太多压力',
        impacts: {},
      },
    ],
  },
]

// Q5 选项 → 优先维度映射
export const PRIORITY_MAP: Record<string, DimensionKey> = {
  q5a: 'physical',
  q5b: 'energy',
  q5c: 'career',
}

// Q6 选项 → 难度映射
export type Difficulty = 'easy' | 'medium' | 'hard' | 'casual'
export const DIFFICULTY_MAP: Record<string, Difficulty> = {
  q6a: 'easy',
  q6b: 'medium',
  q6c: 'hard',
  q6d: 'casual',
}
