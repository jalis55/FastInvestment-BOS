import { PageIntro } from '@/components/ui/page-intro';

export default function BannerTitle({ title, description, actions }) {
  return <PageIntro as="h1" title={title} description={description} actions={actions} />;
}
