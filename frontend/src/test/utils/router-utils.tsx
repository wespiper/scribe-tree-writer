import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RouteObject } from 'react-router-dom';

interface RenderWithRouterOptions {
  routes?: RouteObject[];
  initialEntries?: string[];
}

export function createTestRouter(options: RenderWithRouterOptions = {}) {
  const {
    routes = [{ path: '*', element: <div>Test Route</div> }],
    initialEntries = ['/'],
  } = options;

  return createMemoryRouter(routes, {
    initialEntries,
  });
}

export function TestRouterProvider({ ...options }: RenderWithRouterOptions) {
  const router = createTestRouter(options);
  return <RouterProvider router={router} />;
}
