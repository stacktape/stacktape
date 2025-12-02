import Image from 'next/image';
import { BiChevronRight, BiLogoGithub } from 'react-icons/bi';
import { LuArrowUpRight } from 'react-icons/lu';
import allStarterProjects from '../../../../starter-projects-metadata.json';
import { onMaxW650 } from '../../styles/responsive';
import { colors } from '../../styles/variables';
import { Box } from '../Box/Box';
import { Button } from '../Button/Button';
import { GridList } from '../Misc/GridList';
import { Link } from './Link';

function List({
  starterProjects,
  includeShowMore
}: {
  starterProjects: (typeof allStarterProjects)[0][];
  includeShowMore?: boolean;
}) {
  return (
    <GridList
      minItemWidth="382px"
      rootCss={{
        marginTop: '20px',
        [onMaxW650]: {
          display: 'block',
          width: '100%'
        }
      }}
    >
      {starterProjects.map((project) => (
        <Box
          key={project.starterProjectId}
          rootCss={{
            height: '100%',
            padding: '8px 16px 14px 16px',
            [onMaxW650]: {
              width: '100%',
              marginBottom: '10px'
            }
          }}
        >
          <div
            css={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <div
              css={{
                width: 'calc(100%)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div css={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                  <Image
                    src={`/starter-project-icons/${project.icon}`}
                    width={22}
                    height={22}
                    css={{ padding: 0, marginRight: '10px' }}
                    alt={`${project.name} icon`}
                  />
                  <h3 css={{ fontSize: '1.05rem' }}>{project.name}</h3>
                </div>
                {/* <p css={{ lineHeight: 1.6 }}>{project.description}</p> */}
              </div>
              <div css={{ display: 'flex', gap: '13px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button
                  icon={<BiLogoGithub size={20} />}
                  text="View on Github"
                  iconPosition="end"
                  visualType="secondary"
                  linkTo={project.githubLink}
                />
                <Button
                  icon={<LuArrowUpRight size={20} />}
                  iconPosition="end"
                  text="Deploy in Console"
                  visualType="secondary"
                  linkTo={`https://console.stacktape.com/create-new-project/git-project-using-console?name=my-stacktape-app&repositoryType=public&repositoryUrl=${project.githubLink}`}
                />
              </div>
            </div>
          </div>
        </Box>
      ))}
      {includeShowMore && (
        <Box interactive rootCss={{ '&:hover': { boxShadow: '0 1px 2px 2.5px rgba(19, 24, 24, 0.9)' } }}>
          <Link href="/getting-started/starter-projects/">
            <div
              css={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 95 }}
            >
              <p css={{ fontSize: '1rem' }}>Show 25 more</p>
              <BiChevronRight color={colors.fontColorPrimary} size={30} />
            </div>
          </Link>
        </Box>
      )}
    </GridList>
  );
}

export function StarterProjectList() {
  return <List starterProjects={allStarterProjects} />;
}

export function StarterProjectListShort() {
  return (
    <List
      starterProjects={allStarterProjects.filter((project) =>
        [
          'expressjs-api-postgres',
          'nextjs-ssr-website-lambda',
          'lambda-api-dynamo-db',
          'lambda-api-mongo-db',
          'react-spa-vitejs',
          'remix-website-container',
          'django-api-postgres'
        ].includes(project.starterProjectId)
      )}
      includeShowMore
    />
  );
}
