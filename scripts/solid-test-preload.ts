import { plugin } from 'bun';
import { createStacktapeOpenTuiBuildPlugin } from '@shared/utils/stacktape-opentui';

plugin(createStacktapeOpenTuiBuildPlugin());
