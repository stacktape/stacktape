import ecs from './ecs-enhanced-deployment.html?raw';
import loadBalancer from './why-i-do-not-use-load-balancer.html?raw';

export const legacyPosts = [
  {
    slug: 'ecs-enhanced-deployment',
    title: 'Improving ECS deployment',
    date: 'February 21, 2024',
    note: 'The screenshots show the 2024 CLI. Stacktape still reports stopped ECS tasks and their logs during full stack deployments.',
    body: ecs
  },
  {
    slug: 'why-i-do-not-use-load-balancer',
    title: 'Why I Do Not Use AWS Load Balancer for My ECS Containers',
    date: 'August 1, 2024',
    note: 'Prices are from 2024. In Stacktape v4, HTTP API Gateway is still the default for web services. Configure internalHealthCheck to enable application health checks.',
    body: loadBalancer
  }
];
