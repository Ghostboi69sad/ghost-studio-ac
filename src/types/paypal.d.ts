import { PayPalHttpClient } from '@paypal/checkout-server-sdk';

declare module '@paypal/checkout-server-sdk' {
  namespace paypal {
    interface PayPalOrderResponse {
      id: string;
      links: Array<{
        href: string;
        rel: string;
        method?: string;
      }>;
      status?: string;
      purchase_units?: Array<{
        amount: {
          currency_code: string;
          value: string;
        };
        custom_id?: string;
      }>;
    }

    export namespace core {
      export class PayPalHttpClient {
        constructor(environment: SandboxEnvironment | LiveEnvironment);
        execute<T>(request: any): Promise<{
          statusCode: number;
          result: T;
        }>;
      }

      export class SandboxEnvironment {
        constructor(clientId: string, clientSecret: string);
      }

      export class LiveEnvironment {
        constructor(clientId: string, clientSecret: string);
      }
    }

    export namespace orders {
      export class OrdersCreateRequest {
        prefer(header: string): void;
        requestBody(body: OrdersCreateRequestBody): void;
      }

      export class OrdersGetRequest {
        constructor(orderId: string);
      }

      export class OrdersCaptureRequest {
        constructor(orderId: string);
      }
    }
  }

  const paypal: typeof paypal;
  export = paypal;
}

interface OrdersCreateRequestBody {
  intent: string;
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    custom_id?: string;
    description?: string;
  }>;
  application_context?: {
    brand_name?: string;
    landing_page?: string;
    user_action?: string;
    return_url: string;
    cancel_url: string;
  };
}
