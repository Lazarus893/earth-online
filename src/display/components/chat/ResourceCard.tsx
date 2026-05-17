import { motion } from 'framer-motion'

export interface ResourceItem {
  title: string
  description: string
  url?: string
  icon?: string
  tag?: string
  guide?: string // 使用指南/推荐理由
}

interface ResourceCardProps {
  resources: ResourceItem[]
}

/** 根据 tag 返回对应的强调色 */
function getTagColor(tag?: string): string {
  if (!tag) return 'rgba(34, 211, 238, 0.8)'
  const lower = tag.toLowerCase()
  if (lower.includes('github')) return '#10B981' // green
  if (lower.includes('skill')) return '#A78BFA' // purple
  if (lower.includes('视频') || lower.includes('video')) return '#22D3EE' // cyan
  return 'rgba(251, 191, 36, 0.8)' // gold default
}

/**
 * 资源推荐卡片 — 多类型支持
 * 根据 tag 区分: 视频(cyan)、GitHub(green)、Skill(purple)、其他(gold)
 */
export default function ResourceCard({ resources }: ResourceCardProps) {
  return (
    <div className="resource-cards">
      {resources.map((item, i) => {
        const tagColor = getTagColor(item.tag)
        return (
          <motion.a
            key={i}
            className="resource-card"
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.2 }}
            onClick={(e) => { if (!item.url) e.preventDefault() }}
            style={{ borderColor: `${tagColor}22` }}
          >
            <div className="resource-card__icon" style={{ background: `${tagColor}12` }}>
              {item.icon || '📄'}
            </div>
            <div className="resource-card__body">
              <div className="resource-card__title">{item.title}</div>
              <div className="resource-card__desc">{item.description}</div>
              {item.guide && (
                <div className="resource-card__guide">💡 {item.guide}</div>
              )}
              {item.tag && (
                <span className="resource-card__tag" style={{ color: tagColor, borderColor: `${tagColor}33`, background: `${tagColor}0a` }}>
                  {item.tag}
                </span>
              )}
            </div>
            {item.url && (
              <span className="resource-card__arrow" style={{ color: tagColor }}>→</span>
            )}
          </motion.a>
        )
      })}
    </div>
  )
}

/**
 * 从消息文本中解析资源卡片数据
 * 格式: ```resources\n[{...}]\n```
 */
export function parseResources(content: string): { text: string; resources: ResourceItem[] } | null {
  const match = content.match(/```resources\n([\s\S]*?)\n```/)
  if (!match) return null

  try {
    const resources: ResourceItem[] = JSON.parse(match[1])
    const text = content.replace(/```resources\n[\s\S]*?\n```/, '').trim()
    return { text, resources }
  } catch {
    return null
  }
}
