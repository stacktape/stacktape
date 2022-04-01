import * as React from 'react';
import {
  pageStyles,
  headingStyles,
  headingAccentStyles,
  listStyles,
  docLinkStyle,
  linkStyle,
  listItemStyles,
  descriptionStyle,
  footerStyle,
  footerLinkStyle,
  logoStyle,
  logoImgStyle,
} from '../styles/styles';

const docLink = {
  text: 'Gatsby Documentation',
  url: 'https://www.gatsbyjs.com/docs/',
  color: '#8954A8',
};

// data
const links = [
  {
    text: 'Tutorial',
    url: 'https://www.gatsbyjs.com/docs/tutorial/',
    description:
      "A great place to get started if you're new to web development. Designed to guide you through setting up your first Gatsby site.",
    color: '#E95800',
  },
  {
    text: 'How to Guides',
    url: 'https://www.gatsbyjs.com/docs/how-to/',
    description:
      "Practical step-by-step guides to help you achieve a specific goal. Most useful when you're trying to get something done.",
    color: '#1099A8',
  },
  {
    text: 'Reference Guides',
    url: 'https://www.gatsbyjs.com/docs/reference/',
    description:
      "Nitty-gritty technical descriptions of how Gatsby works. Most useful when you need detailed information about Gatsby's APIs.",
    color: '#BC027F',
  },
  {
    text: 'Conceptual Guides',
    url: 'https://www.gatsbyjs.com/docs/conceptual/',
    description:
      'Big-picture explanations of higher-level Gatsby concepts. Most useful for building understanding of a particular topic.',
    color: '#0D96F2',
  },
  {
    text: 'Plugin Library',
    url: 'https://www.gatsbyjs.com/plugins',
    description:
      'Add functionality and customize your Gatsby site or app with thousands of plugins built by our amazing developer community.',
    color: '#8EB814',
  },
];

// markup
const IndexPage = () => {
  return (
    <React.Fragment>
      <main style={pageStyles}>
        <title>Home Page</title>
        <h1 style={headingStyles}>
          Congratulations — you just made a Gatsby site!
          <br />
          <a>
            <span style={headingAccentStyles}>Powered by Stacktape! </span>
          </a>
          <span role="img" aria-label="Party popper emojis">
            🎉🎉🎉
          </span>
        </h1>
        <ul style={listStyles}>
          <li style={{ ...docLinkStyle, fontWeight: 'bold' }}>
            <a style={linkStyle} href="https://docs.stacktape.com/">
              Stacktape documentation
            </a>
          </li>
          <li style={docLinkStyle}>
            <a
              style={linkStyle}
              href={`${docLink.url}?utm_source=starter&utm_medium=start-page&utm_campaign=minimal-starter`}
            >
              {docLink.text}
            </a>
          </li>
          {links.map((link) => (
            <li key={link.url} style={{ ...listItemStyles, color: link.color }}>
              <span>
                <a
                  style={linkStyle}
                  href={`${link.url}?utm_source=starter&utm_medium=start-page&utm_campaign=minimal-starter`}
                >
                  {link.text}
                </a>
                <p style={descriptionStyle}>{link.description}</p>
              </span>
            </li>
          ))}
        </ul>
      </main>
      <footer style={footerStyle}>
        <a href="https://stacktape.com" target="_blank" rel="noopener noreferrer" style={footerLinkStyle}>
          Powered by
          <span style={logoStyle}>
            <img style={logoImgStyle} src={'stacktape-logo.svg'} alt="Stacktape Logo" />
          </span>
          Stacktape
        </a>
      </footer>
    </React.Fragment>
  );
};

export default IndexPage;
