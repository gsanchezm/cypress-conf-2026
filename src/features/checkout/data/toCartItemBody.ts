import type { CartItemRequest } from '../../../core/types';

export interface CartItemBody {
  pizza_id: string;
  quantity: number;
  size?: string;
  toppings?: string[];
}

// Shared by CheckoutRequestBuilder (the /checkout payload) and
// CheckoutFacade.seedCartViaApi (the /cart seed payload) - both send the
// same items, and having two separate mappers is exactly how the seeded
// cart and the checkout payload could silently diverge (e.g. one carrying
// toppings, the other dropping them).
export function toCartItemBody(item: CartItemRequest): CartItemBody {
  return {
    pizza_id: item.pizzaId,
    quantity: item.quantity,
    ...(item.size !== undefined && { size: item.size }),
    ...(item.toppings !== undefined && { toppings: item.toppings }),
  };
}
