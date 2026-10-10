import Image from 'next/image'
import { safeBannerLink, type BannerContent } from './model'
import styles from './banner-card.module.css'

export function BannerCard({ banner, preview = false, onFollow }: {
  banner: BannerContent; preview?: boolean; onFollow?: () => void
}) {
  const href = safeBannerLink(banner.link_url)
  const template = banner.template || 'image'
  if (template === 'image' && banner.image_url) {
    const images = <>
      <Image src={banner.image_url} width={800} height={200} unoptimized alt={banner.title}
        className={`${styles.legacyImage} ${styles.desktopImage}`} />
      {banner.mobile_image_url && <Image src={banner.mobile_image_url} width={400} height={200} unoptimized
        alt={banner.title} className={`${styles.legacyImage} ${styles.mobileImage}`} />}
    </>
    return <div className={`${styles.shell} ${banner.mobile_image_url ? styles.hasMobile : ''}`}>
      {href && !preview ? <a className={styles.legacy} href={href} onClick={onFollow}>{images}</a> : <div className={styles.legacy}>{images}</div>}
    </div>
  }
  const theme = template === 'informational' || template === 'promotional' ? template : 'classic'
  return <article className={`${styles.shell} ${styles[theme]}`}>
    <div className={styles.inner}>
      <span className={styles.ornament} aria-hidden="true" />
      <div className={styles.copy}>
        <span className={styles.eyebrow}>{theme === 'informational' ? 'Informação do clube' : theme === 'promotional' ? 'Em destaque' : 'Clube da Sueca'}</span>
        <h2 className={styles.title}>{banner.title}</h2>
        {banner.description && <p className={styles.description}>{banner.description}</p>}
      </div>
      {href && (preview
        ? <span className={styles.cta}><span>{banner.cta_label || 'Saiba mais'}</span><span aria-hidden="true">→</span></span>
        : <a className={styles.cta} href={href} onClick={onFollow}><span>{banner.cta_label || 'Saiba mais'}</span><span aria-hidden="true">→</span></a>)}
    </div>
  </article>
}
