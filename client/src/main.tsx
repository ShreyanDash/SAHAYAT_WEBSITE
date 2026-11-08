import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

async function fetchTrpcResponse(input: RequestInfo | URL, init?: RequestInit) {
  const response = await globalThis.fetch(input, init);
  const body = await response.text();

  try {
    JSON.parse(body);
  } catch {
    const requestPath = getRequestUrl(input);
    const message = response.status === 404
      ? "The subscription service is unavailable. Please try again later."
      : "The subscription service returned an invalid response. Please try again later.";
    console.error("[API] Expected JSON from tRPC endpoint", {
      requestPath,
      status: response.status,
      contentType: response.headers.get("content-type"),
    });

    return new Response(JSON.stringify([{
      error: {
        json: {
          message,
          code: -32603,
          data: {
            code: "INTERNAL_SERVER_ERROR",
            httpStatus: response.status || 502,
            path: requestPath,
          },
        },
      },
    }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const redirectToLoginIfUnauthorized = (_error: unknown) => {
  // Authentication is not used in the independent deployment.
  // This handler is kept as a stub for future use.
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        return {};
      },
      fetch(input, init) {
        return fetchTrpcResponse(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
