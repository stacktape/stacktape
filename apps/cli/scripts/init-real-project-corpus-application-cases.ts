import type { RealProjectCorpusCase } from './init-real-project-corpus-cases';

/** Pinned production applications and substantial starters representative of Stacktape's target customers. */
const ALL_REAL_PROJECT_APPLICATION_CASES = [
  {
    id: 'real-documenso',
    repository: 'https://github.com/documenso/documenso.git',
    commit: '779de01fe8fb8c242da867b6c1fa38c70e448c3a',
    source: 'real-application',
    exercises: ['saas', 'nextjs', 'monorepo', 'postgres', 'prisma', 'email', 'object-storage'],
    expect: {
      resourceTypes: { 'nextjs-web': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-chatwoot',
    repository: 'https://github.com/chatwoot/chatwoot.git',
    commit: '89a933f76310aea84cdf7eddc36f1f214f0459d9',
    source: 'real-application',
    exercises: ['saas', 'rails', 'sidekiq', 'postgres', 'redis', 'object-storage'],
    expect: {
      resourceTypes: {
        bastion: 1,
        'redis-cluster': 1,
        'relational-database': 1,
        'web-service': 1,
        'worker-service': 1
      },
      dependencyKinds: { email: 1, postgres: 1, redis: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      existingDeployments: ['heroku'],
      requiredConfig: ['type: web-service', 'type: worker-service'],
      forbiddenConfig: ['bin/vite dev', 'chatwoot-vite:development'],
      requiredGapPatterns: ['Sending email uses SES', 'Heroku deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-outline',
    repository: 'https://github.com/outline/outline.git',
    commit: 'd43cb6dfce59e41abbe1b79c4fae86fe20949431',
    source: 'real-application',
    exercises: ['saas', 'node', 'worker', 'postgres', 'redis', 'object-storage'],
    expect: {
      resourceTypes: {
        bastion: 1,
        bucket: 1,
        'redis-cluster': 1,
        'relational-database': 1,
        'web-service': 1,
        'worker-service': 1
      },
      dependencyKinds: { email: 1, 'object-storage': 1, postgres: 1, redis: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      existingDeployments: ['heroku'],
      requiredConfig: ['type: bucket', 'type: worker-service'],
      requiredGapPatterns: ['Sending email uses SES', 'Heroku deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-infisical',
    repository: 'https://github.com/Infisical/infisical.git',
    commit: '2ade76f8b6640990a1d6193b599295100573d347',
    source: 'real-application',
    exercises: ['saas', 'typescript', 'monorepo', 'postgres', 'redis', 'workers'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-twenty-crm',
    repository: 'https://github.com/twentyhq/twenty.git',
    commit: 'd43ab1649d03bad5bfc0db559ee3de4fe5cbee49',
    source: 'real-application',
    exercises: ['saas', 'nestjs', 'monorepo', 'postgres', 'redis', 'worker'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-plane',
    repository: 'https://github.com/makeplane/plane.git',
    commit: 'e056bbf9eb6b511cdc0a5823b1bd6922e561a485',
    source: 'real-application',
    exercises: ['saas', 'django', 'nextjs', 'workers', 'postgres', 'redis', 'object-storage'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-paperless-ngx',
    repository: 'https://github.com/paperless-ngx/paperless-ngx.git',
    commit: 'f2806179a29612dba787af234d8c9fdf8d927c1a',
    source: 'real-application',
    exercises: ['django', 'celery', 'postgres', 'redis', 'persistent-storage', 'ocr'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-mastodon',
    repository: 'https://github.com/mastodon/mastodon.git',
    commit: 'a12438a5a6e1d17be7baf9c0ce27ea57fd1d2236',
    source: 'real-application',
    exercises: ['rails', 'sidekiq', 'streaming', 'postgres', 'redis', 'object-storage'],
    expect: {
      resourceTypes: {
        bastion: 1,
        bucket: 1,
        'redis-cluster': 1,
        'relational-database': 1,
        'web-service': 2,
        'worker-service': 1
      },
      dependencyKinds: { 'object-storage': 1, postgres: 1, redis: 1 },
      serviceCount: 3,
      httpServiceCount: 2,
      existingDeployments: ['heroku'],
      requiredConfig: ['type: bucket', 'type: worker-service'],
      requiredGapPatterns: ['Heroku deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-novu',
    repository: 'https://github.com/novuhq/novu.git',
    commit: '3f6bb5488504386581be0004f88a2f34736084e1',
    source: 'real-application',
    exercises: ['saas', 'nestjs', 'monorepo', 'workers', 'mongodb', 'redis'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-listmonk',
    repository: 'https://github.com/knadh/listmonk.git',
    commit: '670c01717d48647093335cc23a6be6f4b79c3b6b',
    source: 'real-application',
    exercises: ['go', 'postgres', 'docker', 'email'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-cal-com',
    repository: 'https://github.com/calcom/cal.com.git',
    commit: '176037d0afbe572f870a3c702985e7cd83fe6c0c',
    source: 'real-application',
    exercises: ['saas', 'nextjs', 'monorepo', 'postgres', 'prisma', 'workers'],
    expect: {
      resourceTypes: { 'nextjs-web': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-dub',
    repository: 'https://github.com/dubinc/dub.git',
    commit: '8cc27af6100cafbfe0d6ff600e2c9a4fb63b9bdd',
    source: 'real-application',
    exercises: ['saas', 'nextjs', 'monorepo', 'postgres', 'redis', 'object-storage'],
    expect: {
      resourceTypes: { 'nextjs-web': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'create-t3-turbo-starter',
    repository: 'https://github.com/t3-oss/create-t3-turbo.git',
    commit: '8f945b7bb3bfb3ca8358d48b1ff0214079bc11ee',
    source: 'official-starter',
    exercises: ['saas-starter', 'nextjs', 'expo', 'monorepo', 'postgres', 'drizzle'],
    expect: {
      resourceTypes: { 'nextjs-web': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'turborepo-docker-example',
    repository: 'https://github.com/vercel/turborepo.git',
    commit: '09bf969d02f03bcff70afdc71d252c6da46729e7',
    subdirectory: 'examples/with-docker',
    source: 'official-example',
    exercises: ['turborepo', 'nextjs', 'monorepo', 'docker'],
    expect: {
      resourceTypes: { 'nextjs-web': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'cookiecutter-django-template',
    repository: 'https://github.com/cookiecutter/cookiecutter-django.git',
    commit: '5494104be34b25f2b687ff0a0e813368a51490f5',
    source: 'official-starter',
    exercises: ['django-template', 'celery', 'postgres', 'redis', 'docker'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-forem',
    repository: 'https://github.com/forem/forem.git',
    commit: '20d26f3d3255e8af3807de6fd458af2f3138ddab',
    source: 'real-application',
    exercises: ['rails', 'sidekiq', 'postgres', 'redis', 'object-storage'],
    expect: {
      resourceTypes: {
        bastion: 1,
        'redis-cluster': 1,
        'relational-database': 1,
        'web-service': 1,
        'worker-service': 1
      },
      dependencyKinds: { postgres: 1, redis: 1 },
      serviceCount: 2,
      httpServiceCount: 1,
      existingDeployments: ['netlify'],
      requiredConfig: ['type: worker-service'],
      requiredGapPatterns: ['Netlify deployment config'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'go-clean-template',
    repository: 'https://github.com/evrone/go-clean-template.git',
    commit: '376bcd4fa54ffba55540408f80b68db22bcc16cc',
    source: 'official-starter',
    exercises: ['go', 'postgres', 'rabbitmq', 'nats', 'docker', 'migrations'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { amqp: 1, nats: 1, postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      requiredGapPatterns: ['RabbitMQ-compatible AMQP broker', 'NATS-compatible broker'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-authelia',
    repository: 'https://github.com/authelia/authelia.git',
    commit: '78e2c5e7f60cbd84403a4009119bfca9ec90efa1',
    source: 'real-application',
    exercises: ['go', 'authentication', 'postgres', 'redis', 'smtp', 'docker'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-monica',
    repository: 'https://github.com/monicahq/monica.git',
    commit: 'e08e91734170b6bbd582cb578532c3948196124e',
    source: 'real-application',
    exercises: ['laravel', 'queues', 'mysql', 'redis', 'object-storage'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-koel-docker',
    repository: 'https://github.com/koel/docker.git',
    commit: '924a03870e25629303ff283f9f381ba19f81dc95',
    source: 'real-application',
    exercises: ['laravel', 'music', 'mysql', 'persistent-storage', 'docker'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-plausible-community-edition',
    repository: 'https://github.com/plausible/community-edition.git',
    commit: 'ec6c4da776547516d8f48159ce1a704df4f475ad',
    source: 'real-application',
    exercises: ['elixir', 'analytics', 'postgres', 'clickhouse', 'docker'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'zero-to-production-rust',
    repository: 'https://github.com/LukeMathWalker/zero-to-production.git',
    commit: '970987c5f793af6fc8e557731c9bbb23b620451e',
    source: 'official-example',
    exercises: ['rust', 'postgres', 'docker', 'migrations', 'email'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-lemmy',
    repository: 'https://github.com/LemmyNet/lemmy.git',
    commit: '439734dd638a2c06a2f907beab7dcf4646e88f86',
    source: 'real-application',
    exercises: ['rust', 'federation', 'postgres', 'object-storage', 'docker'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'spring-petclinic',
    repository: 'https://github.com/spring-projects/spring-petclinic.git',
    commit: '88e37c15cf6fc8490b01bc3e8e2c800cec1ac272',
    source: 'official-example',
    exercises: ['java', 'spring-boot', 'mysql', 'docker'],
    expect: {
      resourceTypes: { bastion: 1, 'relational-database': 1, 'web-service': 1 },
      dependencyKinds: { postgres: 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      existingDeployments: [],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'dotnet-eshop',
    repository: 'https://github.com/dotnet/eShop.git',
    commit: '9b4f9434f46fdc5c1a6e9e936af2868340cdbc48',
    source: 'official-example',
    exercises: ['dotnet', 'aspire', 'microservices', 'postgres', 'redis', 'rabbitmq'],
    expect: {
      resourceTypes: {
        bastion: 1,
        'redis-cluster': 1,
        'relational-database': 1,
        'web-service': 8,
        'worker-service': 1
      },
      dependencyKinds: { amqp: 1, postgres: 1, redis: 1 },
      serviceCount: 9,
      httpServiceCount: 8,
      existingDeployments: [],
      requiredGapPatterns: ['RabbitMQ-compatible AMQP broker'],
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-fleet',
    repository: 'https://github.com/fleetdm/fleet.git',
    commit: 'fa9b6c9ca215cc140546e29004b2971e7491a64b',
    source: 'real-application',
    exercises: ['go', 'mysql', 'redis', 's3', 'docker', 'terraform'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-appwrite',
    repository: 'https://github.com/appwrite/appwrite.git',
    commit: 'e117380310878726bff60671d7de09e1cd0be135',
    source: 'real-application',
    exercises: ['php', 'microservices', 'workers', 'mariadb', 'redis', 'object-storage'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-nocodb',
    repository: 'https://github.com/nocodb/nocodb.git',
    commit: '2025339ed51fcd0db10ad3972eacf0625039fbd4',
    source: 'real-application',
    exercises: ['nestjs', 'monorepo', 'workers', 'postgres', 'redis', 'docker'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-supabase',
    repository: 'https://github.com/supabase/supabase.git',
    commit: 'ff6c8d4b30326fe5476a697cf6df4209965449b8',
    source: 'real-application',
    exercises: ['platform', 'monorepo', 'postgres', 'docker-compose', 'edge-functions'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-hoppscotch',
    repository: 'https://github.com/hoppscotch/hoppscotch.git',
    commit: '1acb8a3a7581e4db32ba0d529170c4669a2e1053',
    source: 'real-application',
    exercises: ['nestjs', 'monorepo', 'postgres', 'redis', 'websocket', 'docker'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  },
  {
    id: 'real-tooljet',
    repository: 'https://github.com/ToolJet/ToolJet.git',
    commit: '1ebdee2e51db3d53d17a4b6d82cde682b92dbab2',
    source: 'real-application',
    exercises: ['nestjs', 'react', 'monorepo', 'postgres', 'redis', 'workers'],
    expect: {
      resourceTypes: { 'web-service': 1 },
      serviceCount: 1,
      httpServiceCount: 1,
      forbidCurrentlyHostedDependencies: true
    }
  }
] as const satisfies readonly RealProjectCorpusCase[];

const RELEASE_CASE_IDS = new Set([
  'real-chatwoot',
  'real-outline',
  'real-mastodon',
  'real-forem',
  'go-clean-template',
  'zero-to-production-rust',
  'real-lemmy',
  'spring-petclinic',
  'dotnet-eshop'
]);

/** Customer-shaped applications whose exact inferred topology is reviewed and release-blocking. */
export const REAL_PROJECT_APPLICATION_CASES: readonly RealProjectCorpusCase[] =
  ALL_REAL_PROJECT_APPLICATION_CASES.filter((entry) => RELEASE_CASE_IDS.has(entry.id));

/** Large, template, prebuilt-image, or otherwise ambiguous repositories retained as a stress/evaluation tier. */
export const REAL_PROJECT_APPLICATION_STRESS_CASES: readonly RealProjectCorpusCase[] =
  ALL_REAL_PROJECT_APPLICATION_CASES.filter((entry) => !RELEASE_CASE_IDS.has(entry.id));
