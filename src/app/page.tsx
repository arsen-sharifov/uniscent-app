import type { Metadata } from 'next';

import { getTranslations } from '@/i18n/translations';

import { Landing } from './fragments';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations();

  return { description: t.common.metadata.description };
};

const LandingPage = () => <Landing />;

export default LandingPage;
