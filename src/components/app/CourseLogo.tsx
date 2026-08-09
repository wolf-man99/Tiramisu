import type { IconType } from 'react-icons';
import { SiMeta, SiGoogleads, SiReddit, SiSnapchat } from 'react-icons/si';
import { FaLinkedinIn } from 'react-icons/fa6';

/**
 * Courses tied to a real advertising platform show that platform's own mark
 * instead of an emoji. SQL for Marketers isn't a real-world brand, so it has
 * no entry here and keeps its emoji.
 */
const COURSE_LOGO: Record<string, IconType> = {
  'meta-ads': SiMeta,
  'google-ads': SiGoogleads,
  'linkedin-ads': FaLinkedinIn,
  'reddit-ads': SiReddit,
  'snapchat-ads': SiSnapchat,
};

/**
 * Renders in ink rather than each brand's own colour so it sits cleanly on
 * any of the six course-accent tints — the badge behind it already carries
 * the course's identity colour, the mark just needs to be legible on it.
 */
export function CourseLogo({
  courseId,
  emoji,
  size = 48,
  className,
}: {
  courseId: string;
  emoji: string;
  size?: number;
  className?: string;
}) {
  const Icon = COURSE_LOGO[courseId];
  if (!Icon) {
    return (
      <span className={className} style={{ fontSize: size * 0.5, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }
  return <Icon size={size * 0.56} color="var(--ink)" className={className} />;
}
