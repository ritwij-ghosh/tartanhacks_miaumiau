import { RouterProvider } from 'react-router';
import { router } from './routes';

function App() {
  return (
    <div className="riso-grain">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
