export interface User {
  email: string;
  name?: string;
  proAccessState?: {
    trial?: {
      end?: string;
    }
  };
  username: string;
}
