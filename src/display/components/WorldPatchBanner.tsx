import { motion } from 'framer-motion'
import { colors, easing, duration } from '../../design-system'
import HudText from './ui/HudText'
import type { WorldPatch } from '../../hooks/useWorldPatch'

interface WorldPatchBannerProps {
  patch?: WorldPatch | null
  loading?: boolean
  streak?: number
}

export default function WorldPatchBanner({ patch, loading, streak = 0 }: WorldPatchBannerProps) {
  // Determine modifier badges to show
  const badges: { label: string; color: string }[] = []

  if (patch) {
    if (patch.weather.outdoor_bonus > 0) {
      badges.push({ label: `Physical +${patch.weather.outdoor_bonus}%`, color: colors.physical })
    } else if (patch.weather.outdoor_bonus < 0) {
      badges.push({ label: `Physical ${patch.weather.outdoor_bonus}%`, color: colors.danger })
    }
    if (patch.career.career_modifier > 0) {
      badges.push({ label: `Career +${patch.career.career_modifier}%`, color: colors.career })
    } else if (patch.career.career_modifier < 0) {
      badges.push({ label: `Career ${patch.career.career_modifier}%`, color: colors.danger })
    }
    if (patch.economy.finance_modifier > 0) {
      badges.push({ label: `Finance +${patch.economy.finance_modifier}%`, color: colors.finance })
    } else if (patch.economy.finance_modifier < 0) {
      badges.push({ label: `Finance ${patch.economy.finance_modifier}%`, color: colors.danger })
    }
  }

  return (
    <motion.header
      className="world-patch-bar"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: duration.normal, ease: easing.smooth }}
    >
      <div className="world-patch-bar__brand">
        <span className="world-patch-bar__mark" />
        <HudText variant="system">ORACLE OS</HudText>
      </div>

      <div className="world-patch-bar__center">
        {loading ? (
          <span style={{ color: colors.textMuted }}>SYNCING WORLD DATA...</span>
        ) : patch ? (
          <>
            <span>PATCH {patch.version}</span>
            <span className="world-patch-bar__divider" />
            <span className="world-patch-bar__muted">
              {patch.weather.city} · {patch.weather.temp} {patch.weather.condition}
            </span>
            {badges.length > 0 && (
              <>
                <span className="world-patch-bar__divider patch-hide-mobile" />
                {badges.map((badge, i) => (
                  <span key={i} className="patch-hide-mobile" style={{ color: badge.color, marginLeft: i > 0 ? 8 : 0 }}>
                    {badge.label}
                  </span>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <span>PATCH OFFLINE</span>
            <span className="world-patch-bar__divider" />
            <span className="world-patch-bar__muted">Data unavailable</span>
          </>
        )}
      </div>

      <div className="world-patch-bar__streak">
        <span>STREAK</span>
        <strong>{streak}</strong>
      </div>
    </motion.header>
  )
}
