import { Button } from '@evershop/evershop/components/common/ui/Button';
import {
  useCheckout,
  useCheckoutDispatch
} from '@evershop/evershop/components/frontStore/checkout/CheckoutContext';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

type MakePayMethodProps = {
  createPaymentLinkApi: string;
  setting: {
    makepayDisplayName: string;
  };
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
};

function MakePayMark() {
  return (
    <span className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs font-semibold">
      MakePay
    </span>
  );
}

export default function MakePayMethod({
  createPaymentLinkApi,
  setting: { makepayDisplayName }
}: MakePayMethodProps) {
  const {
    orderPlaced,
    orderId,
    checkoutData: { paymentMethod }
  } = useCheckout();
  const { registerPaymentComponent } = useCheckoutDispatch();
  const redirectStarted = useRef(false);

  useEffect(() => {
    const createPaymentLink = async () => {
      redirectStarted.current = true;
      const result = await fetch(createPaymentLinkApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId
        })
      });
      const data = (await result.json()) as ApiResponse<{
        publicUrl: string;
      }>;

      if (data.error || !data.data?.publicUrl) {
        toast.error(
          data.error?.message ||
            _('MakePay checkout could not be created. Please try again.')
        );
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      window.location.href = data.data.publicUrl;
    };

    if (
      orderPlaced &&
      orderId &&
      paymentMethod === 'makepay' &&
      !redirectStarted.current
    ) {
      createPaymentLink().catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : _('MakePay checkout could not be created. Please try again.')
        );
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      });
    }
  }, [orderPlaced, orderId, paymentMethod, createPaymentLinkApi]);

  useEffect(() => {
    registerPaymentComponent('makepay', {
      nameRenderer: () => (
        <div className="flex items-center justify-between w-full">
          <span>{makepayDisplayName}</span>
          <MakePayMark />
        </div>
      ),
      formRenderer: () => (
        <div className="flex justify-center text-muted-foreground">
          <div className="w-2/3 text-center py-3">
            {_('You will be redirected to secure MakePay checkout.')}
          </div>
        </div>
      ),
      checkoutButtonRenderer: () => {
        const { checkout } = useCheckoutDispatch();
        const { loadingStates, orderPlaced } = useCheckout();
        const handleClick = async (event: React.MouseEvent) => {
          event.preventDefault();
          try {
            await checkout();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : _('Failed to place order. Please try again.')
            );
          }
        };

        const isDisabled = loadingStates.placingOrder || orderPlaced;

        return (
          <Button
            variant="default"
            size="xl"
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className="w-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center space-x-2">
              {loadingStates.placingOrder || orderPlaced ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{_('Redirecting to MakePay...')}</span>
                </>
              ) : (
                <span>{_('Pay with MakePay')}</span>
              )}
            </span>
          </Button>
        );
      }
    });
  }, [registerPaymentComponent, makepayDisplayName]);

  return null;
}

export const layout = {
  areaId: 'checkoutFormAfter',
  sortOrder: 12
};

export const query = `
  query Query {
    setting {
      makepayDisplayName
    }
    createPaymentLinkApi: url(routeId: "makepayCreatePaymentLink")
  }
`;
