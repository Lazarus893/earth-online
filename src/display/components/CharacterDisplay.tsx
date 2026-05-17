import { motion } from 'framer-motion'
import { colors } from '../../design-system'
import { assets } from '../assets'
import HudText from './ui/HudText'

export default function CharacterDisplay() {
  return (
    <motion.div
      className="character-core"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="character-core__halo character-core__halo--outer" />
      <div className="character-core__halo character-core__halo--inner" />

      <video
        className="character-core__video"
        src={assets.character.idleLoop}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      />

      <div className="character-core__scanline" aria-hidden="true" />

      <div className="character-core__readout character-core__readout--left">
        <HudText variant="label" color={colors.patch}>SYNC</HudText>
        <HudText variant="value" color={colors.white} style={{ fontSize: 13 }}>98%</HudText>
      </div>

      <div className="character-core__readout character-core__readout--right">
        <HudText variant="label" color={colors.textDim}>STATE</HudText>
        <HudText variant="value" color={colors.exp} style={{ fontSize: 13 }}>ACTIVE</HudText>
      </div>
    </motion.div>
  )
}
