import React from 'react';
import { headerHtml, footerHtml, articleHtml as rawArticleHtml } from './irs/irsContent';

interface IrsShellProps {
  children?: React.ReactNode;
  showHomeArticle?: boolean;
}

export default function IrsShell({ children, showHomeArticle = false }: IrsShellProps) {
  const articleHtml = showHomeArticle ? rawArticleHtml : '';

  return (
    <>
      <sup id="sup-root" hidden></sup>
      <a href="#main-content" className="visually-hidden-focusable" data-once="pup-accordion-hash-link-events">
        Skip to main content
      </a>

      <div className="dialog-off-canvas-main-canvas" data-off-canvas-main-canvas="">
        <div id="page-wrapper">
          <div id="page">
            <div dangerouslySetInnerHTML={{ __html: headerHtml }} />
            <div id="main-wrapper" className="layout-main-wrapper clearfix">
              <div id="main" className="container">
                <div className="row">
                  <main className="main-content col col-sm-12" id="content" role="main">
                    <a id="main-content" tabIndex={-1}></a>
                    <div data-drupal-messages-fallback="" className="hidden"></div>
                    <div
                      id="block-pup-irs-barrio-content"
                      data-block-plugin-id="system_main_block"
                      className="block block-system block-system-main-block"
                    >
                      <div className="content">
                        {showHomeArticle ? (
                          <div dangerouslySetInnerHTML={{ __html: articleHtml }} />
                        ) : (
                          children
                        )}
                      </div>
                    </div>
                  </main>
                </div>
              </div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              document.addEventListener('click', function(e) {
                var btn = e.target.closest('.usa-banner__button');
                if (btn) {
                  var govInfo = document.getElementById('gov-info');
                  if (govInfo) {
                    var isHidden = govInfo.hasAttribute('hidden');
                    if (isHidden) {
                      govInfo.removeAttribute('hidden');
                      btn.setAttribute('aria-expanded', 'true');
                    } else {
                      govInfo.setAttribute('hidden', '');
                      btn.setAttribute('aria-expanded', 'false');
                    }
                  }
                }
              });
            })();
          `,
        }}
      />
    </>
  );
}
