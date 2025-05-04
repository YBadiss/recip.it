import { AuthState } from "../types";
import { ApiService } from "./api";
import { RecipeService } from "./recipeService";

const defaultAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export class AuthService {
  private state: AuthState = { ...defaultAuthState };
  private stateChangeCallbacks: ((state: AuthState) => void)[] = [];
  private redirectHandler: ((returnPath?: string) => void) | null = null;
  private apiService: ApiService;
  private recipeService: RecipeService; // Will be set later

  constructor(apiService: ApiService, recipeService: RecipeService) {
    this.apiService = apiService;
    this.recipeService = recipeService;
  }

  // Register a callback for state changes
  public subscribe(callback: (state: AuthState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    // Immediately call with current state
    callback(this.state);

    // Return unsubscribe function
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  // Update state and notify subscribers
  private setState(newState: AuthState): void {
    this.state = newState;
    this.stateChangeCallbacks.forEach((callback) => callback(this.state));
  }

  // Get current state
  public getState(): AuthState {
    return { ...this.state };
  }

  // Check if user is already logged in
  public async checkAuthStatus(): Promise<void> {
    try {
      const user = await this.apiService.getCurrentUser();

      if (user && user.id) {
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        await this.recipeService.refreshData();
      } else {
        this.setState({
          ...defaultAuthState,
          isLoading: false,
        });

        await this.recipeService.refreshData();
      }
    } catch (error) {
      this.setState({
        ...defaultAuthState,
        isLoading: false,
      });

      await this.recipeService.refreshData();
    }
  }

  public async login(username: string, password: string): Promise<void> {
    this.setState({ ...this.state, isLoading: true, error: null });

    try {
      const user = await this.apiService.login({ username, password });

      if (user && user.id) {
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        await this.recipeService.refreshData();
      } else {
        throw new Error("Invalid user data received from server");
      }
    } catch (error) {
      this.setState({
        ...this.state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
      throw error;
    }
  }

  public async register(username: string, password: string): Promise<void> {
    this.setState({ ...this.state, isLoading: true, error: null });

    try {
      const user = await this.apiService.register({ username, password });

      if (user && user.id) {
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error("Invalid user data received from server");
      }
    } catch (error) {
      this.setState({
        ...this.state,
        isLoading: false,
        error: error instanceof Error ? error.message : "Registration failed",
      });
      throw error;
    }
  }

  public async logout(): Promise<void> {
    this.setState({ ...this.state, isLoading: true });

    try {
      await this.apiService.logout();
      this.setState({
        ...defaultAuthState,
        isLoading: false,
      });

      await this.recipeService.refreshData();
    } catch (error) {
      this.setState({
        ...defaultAuthState,
        isLoading: false,
      });

      await this.recipeService.refreshData();
    }
  }

  // Set redirect handler for auth redirects
  public setRedirectHandler(handler: (returnPath?: string) => void): void {
    this.redirectHandler = handler;
    // Update the API service handler
    this.apiService.setAuthRedirectHandler(handler);
  }

  // Redirect to login
  public redirectToLogin(returnPath?: string): void {
    if (this.redirectHandler) {
      this.redirectHandler(returnPath);
    }
  }
}
