import { PageIntro } from '@/components/ui/page-intro';

export default function BannerTitle({ title, description, actions }) {
  return <header><PageIntro as="h1" eyebrow="Fast Investment Backoffice" title={title} description={description} actions={actions} className="mb-8" /></header>;
}
