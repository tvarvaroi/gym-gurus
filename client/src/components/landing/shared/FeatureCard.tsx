import { memo } from 'react';
import { motion } from 'framer-motion';
import { fadeInUpVariants } from '@/lib/landingAnimations';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = memo(({ icon, title, description, delay = 0 }: FeatureCardProps) => {
  return (
    <motion.div
      variants={fadeInUpVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="glass-strong rounded-2xl p-6 border border-white/10 hover:border-gold-primary/30 transition-all duration-300 group"
    >
      {/* Icon container */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ duration: 0.3 }}
        className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-primary/20 to-gold-light/10 flex items-center justify-center mb-4 group-hover:from-gold-primary/30 group-hover:to-gold-light/20 transition-all duration-300"
      >
        <div className="text-gold-primary">
          {icon}
        </div>
      </motion.div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-gold-light transition-colors duration-300">
        {title}
      </h3>

      {/* Description */}
      <p className="text-white/70 text-sm leading-relaxed">
        {description}
      </p>

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gold-primary/0 via-gold-primary/5 to-gold-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </motion.div>
  );
});

FeatureCard.displayName = 'FeatureCard';

export default FeatureCard;
