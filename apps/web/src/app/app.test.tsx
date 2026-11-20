import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "@/app/router";
import { AuthProvider } from "@/features/auth/auth-context";
import { api, refreshSession } from "@/lib/api";
import { formatCount } from "@/lib/format";

vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiError,
    api: vi.fn(),
    refreshSession: vi.fn(),
    setAccessToken: vi.fn(),
  };
});

const mockedApi = vi.mocked(api);
const mockedRefresh = vi.mocked(refreshSession);

const user = {
  id: "user-1",
  name: "Танзила",
  email: "tanzila@example.com",
  familyId: "family-1",
  createdAt: "2026-11-20T00:00:00.000Z",
};

const progress = {
  targetCount: 1_000_000,
  totalCount: 347_250,
  todayCount: 3_500,
  remainingCount: 652_750,
  progressPercentage: 34.725,
  goalReached: false,
  membersSubmittedToday: 2,
  totalMembers: 2,
};

const today = {
  date: "2026-11-20",
  timezone: "Europe/Moscow",
  isSubmitted: true,
  count: 1500,
  progressId: "progress-1",
};

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function normalize(value: string) {
  return value.replace(/\s/g, "");
}

beforeEach(() => {
  mockedApi.mockReset();
  mockedRefresh.mockReset();
});

describe("Istighfar interface", () => {
  it("shows the login form when there is no session", async () => {
    mockedRefresh.mockResolvedValue(null);
    renderAt("/login");
    expect(
      await screen.findByRole("button", { name: "Войти" }),
    ).toBeInTheDocument();
  });

  it("shows the shared total and hides individual results", async () => {
    mockedRefresh.mockResolvedValue(user);
    mockedApi.mockImplementation((path: string) => {
      if (path === "/family/progress") return Promise.resolve(progress);
      if (path === "/progress/today") return Promise.resolve(today);
      return Promise.resolve({});
    });
    renderAt("/");
    expect(
      normalize(
        (await screen.findByTestId("dashboard-total")).textContent ?? "",
      ),
    ).toBe(normalize(formatCount(347_250)));
    expect(
      normalize(screen.getByTestId("dashboard-today").textContent ?? ""),
    ).toBe(normalize(formatCount(3_500)));
    expect(
      normalize(screen.getByTestId("dashboard-remaining").textContent ?? ""),
    ).toBe(normalize(formatCount(652_750)));
    expect(screen.getByTestId("dashboard-percent")).toHaveTextContent("34,725");
    expect(
      screen.getByText("Все участники внесли результаты."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/муж/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/жена/i)).not.toBeInTheDocument();
  });

  it("shows a loading state and an error state", async () => {
    mockedRefresh.mockResolvedValue(user);
    mockedApi.mockImplementation(() => new Promise(() => undefined));
    const { unmount } = renderAt("/");
    expect(await screen.findByTestId("dashboard-skeleton")).toBeInTheDocument();
    unmount();

    mockedApi.mockImplementation((path: string) => {
      if (path === "/family/progress")
        return Promise.reject(new Error("Не удалось загрузить прогресс"));
      return Promise.resolve(today);
    });
    renderAt("/");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить прогресс",
    );
  });

  it("validates the daily report and keeps the navigation available", async () => {
    mockedRefresh.mockResolvedValue(user);
    mockedApi.mockImplementation((path: string) => {
      if (path === "/progress/today") {
        return Promise.resolve({
          ...today,
          isSubmitted: false,
          count: null,
          progressId: null,
        });
      }
      if (path === "/family/progress") return Promise.resolve(progress);
      if (path === "/progress/history") return Promise.resolve([]);
      return Promise.resolve({});
    });
    const person = userEvent.setup();
    renderAt("/report");
    const input = await screen.findByLabelText("Количество");
    await person.type(input, "-5");
    await person.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(
      await screen.findByText("Введите целое число от 0 до 100 000"),
    ).toBeInTheDocument();

    await person.click(screen.getAllByRole("link", { name: "История" })[0]!);
    expect(
      await screen.findByRole("heading", { name: "История" }),
    ).toBeInTheDocument();
  });
});
