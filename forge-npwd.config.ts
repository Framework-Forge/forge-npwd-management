import App from './src/App';
import { ManagementAppIcon, NotificationIcon } from './icon';
import { ManagementWidget } from './src/widgets/ManagementWidget';

export const path = '/forge-npwd-management';

export default () => ({
  id: 'forge-npwd-management',
  nameLocale: 'Gestão',
  color: '#ffffff',
  backgroundColor: '#059669',
  path,
  icon: ManagementAppIcon,
  app: App,
  notificationIcon: NotificationIcon,
  homeWidgets: [{
    id: 'dashboard',
    name: 'Painel de gestão',
    description: 'Equipe, cofres, candidaturas e atividade financeira.',
    sizes: [
      { width: 2, height: 1, label: 'Compacto 2×1' },
      { width: 4, height: 1, label: 'Resumo 4×1' },
      { width: 4, height: 2, label: 'Executivo 4×2' },
    ],
    Component: ManagementWidget,
    path,
  }],
});
