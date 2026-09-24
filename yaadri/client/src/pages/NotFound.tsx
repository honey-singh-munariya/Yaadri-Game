import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { EmptyState, PageShell } from '../components/ui'

export default function NotFound() {
  const { t } = useApp()
  return <PageShell><EmptyState mood="idle" title={t('notfound.title')} body={t('notfound.body')} action={<Link to="/" className="btn btn-primary">{t('nav.home')}</Link>} /></PageShell>
}
