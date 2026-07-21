import { Img as Image } from '@/components/Img';
import { BiChevronRight, BiLogoGithub } from 'react-icons/bi';
import { LuArrowUpRight } from 'react-icons/lu';
import { colors } from '../../styles/variables';
import { publicStarterProjects } from '../../utils/starter-projects';
import { Box } from '../Box/Box';
import { Button } from '../Button/Button';
import { GridList } from '../Misc/GridList';
import { Link } from './Link';

function List({
  starterProjects,
  includeShowMore
}: {
  starterProjects: (typeof publicStarterProjects)[0][];
  includeShowMore?: boolean;
}) {
  return (
    <GridList minItemWidth="382px" className="mt-5 max-[650px]:block max-[650px]:w-full">
      {starterProjects.map((project) => (
        <Box
          key={project.starterProjectId}
          className="h-full pt-2 pr-4 pb-[14px] pl-4 max-[650px]:w-full max-[650px]:mb-[10px]"
        >
          <div className="flex justify-between items-center h-full">
            <div className="w-[calc(100%)] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center mb-[2px]">
                  <Image
                    src={`/starter-project-icons/${project.icon}`}
                    width={22}
                    height={22}
                    className="p-0 mr-[10px]"
                    alt={`${project.name} icon`}
                  />
                  <h3 className="text-[1.05rem]">{project.name}</h3>
                </div>
                {/* <p className="leading-[1.6]">{project.description}</p> */}
              </div>
              <div className="flex gap-[13px] justify-end mt-2">
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
        <Box interactive className="hover:shadow-[0_1px_2px_2.5px_rgba(19,24,24,0.9)]">
          <Link href="/getting-started/starter-projects/">
            <div className="flex justify-center items-center h-full min-h-[95px]">
              <p className="text-base">Show 25 more</p>
              <BiChevronRight color={colors.fontColorPrimary} size={30} />
            </div>
          </Link>
        </Box>
      )}
    </GridList>
  );
}

export function StarterProjectList() {
  return <List starterProjects={publicStarterProjects} />;
}

export function StarterProjectListShort() {
  return (
    <List
      starterProjects={publicStarterProjects.filter((project) =>
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
