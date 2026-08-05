'use client';

import { useTranslation } from 'react-i18next';
import {
  BlueskyShareButton,
  EmailShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from 'react-share';

import {
  BlueskyIcon,
  FacebookIcon,
  LinkedinIcon,
  MailIcon,
  ShareIcon,
  TwitterIcon,
  WhatsappIcon,
} from '@/components/icons';

import { SidebarDropdown } from './SidebarDropdown/SidebarDropdown';

interface ShareDropdownProps {
  /** Pre-translated label from the server; falls back to the client i18n instance. */
  readonly label?: string;
}

const LINK_CLASS = 'articleDetailsSidebar-links-link-modal-content-links-link';
const ICON_CLASS = 'articleDetailsSidebar-links-link-modal-content-sharing-icon';

export default function ShareDropdown({ label }: ShareDropdownProps): React.JSX.Element {
  const { t } = useTranslation();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <SidebarDropdown.Provider>
      <SidebarDropdown.Frame>
        <SidebarDropdown.Trigger
          icon={
            <ShareIcon
              size={14}
              className="articleDetailsSidebar-links-link-icon"
              ariaLabel="share icon"
            />
          }
          label={label || t('pages.articleDetails.actions.share.text')}
        />
        <SidebarDropdown.Menu>
          <BlueskyShareButton url={currentUrl} className={LINK_CLASS}>
            <BlueskyIcon size={14} className={ICON_CLASS} ariaLabel="Share on Bluesky" />
            <span>{t('pages.articleDetails.actions.share.bluesky')}</span>
          </BlueskyShareButton>
          <FacebookShareButton url={currentUrl} className={LINK_CLASS}>
            <FacebookIcon size={14} className={ICON_CLASS} ariaLabel="Share on Facebook" />
            <span>{t('pages.articleDetails.actions.share.facebook')}</span>
          </FacebookShareButton>
          <LinkedinShareButton url={currentUrl} className={LINK_CLASS}>
            <LinkedinIcon size={14} className={ICON_CLASS} ariaLabel="Share on LinkedIn" />
            <span>{t('pages.articleDetails.actions.share.linkedin')}</span>
          </LinkedinShareButton>
          <EmailShareButton url={currentUrl} className={LINK_CLASS}>
            <MailIcon size={14} className={ICON_CLASS} ariaLabel="Share via email" />
            <span>{t('pages.articleDetails.actions.share.email')}</span>
          </EmailShareButton>
          <WhatsappShareButton url={currentUrl} className={LINK_CLASS}>
            <WhatsappIcon size={14} className={ICON_CLASS} ariaLabel="Share on WhatsApp" />
            <span>{t('pages.articleDetails.actions.share.whatsapp')}</span>
          </WhatsappShareButton>
          <TwitterShareButton url={currentUrl} className={LINK_CLASS}>
            <TwitterIcon size={14} className={ICON_CLASS} ariaLabel="Share on X (Twitter)" />
            <span>{t('pages.articleDetails.actions.share.twitter')}</span>
          </TwitterShareButton>
        </SidebarDropdown.Menu>
      </SidebarDropdown.Frame>
    </SidebarDropdown.Provider>
  );
}
