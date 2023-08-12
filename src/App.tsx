import { createRoot } from 'react-dom/client';
import Datalayer from './components/Datalayer';

const root = createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<Datalayer />);
