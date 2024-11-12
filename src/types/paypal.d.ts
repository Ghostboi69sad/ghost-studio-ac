 import { PayPalHttpClient } from '@paypal/checkout-server-sdk';

declare module '@paypal/checkout-server-sdk' {
  export namespace orders {
    export class OrdersCreateRequest {
      prefer(header: string): void;
      requestBody(body: {
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
      }): void;
    }

    export class OrdersCaptureRequest {
      constructor(orderId: string);
    }
  }

  export class PayPalHttpClient {
    constructor(environment: any);
    execute<T>(request: any): Promise<{
      statusCode: number;
      result: {
        id: string;
        status: string;
        links: Array<{
          href: string;
          rel: string;
          method: string;
        }>;
      };
    }>;
  }

  export class SandboxEnvironment {
    constructor(clientId: string, clientSecret: string);
  }

  export class LiveEnvironment {
    constructor(clientId: string, clientSecret: string);
  }
}