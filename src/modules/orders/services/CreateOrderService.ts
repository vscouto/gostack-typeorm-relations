import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found!');
    }

    const productsIds = products.map(product => {
      return { id: product.id };
    });

    const foundProducts = await this.productsRepository.findAllById(
      productsIds,
    );

    if (!foundProducts) {
      throw new AppError('Products not found!');
    }

    const productsOrder = products.map(product => {
      const foundProduct = foundProducts.find(prod => prod.id === product.id);

      if (!foundProduct) {
        throw new AppError('Product not found!');
      }

      if (product.quantity > foundProduct.quantity) {
        throw new AppError('Insufficient quantity for the product');
      }

      const productOrder = {
        product_id: product.id,
        price: foundProduct.price,
        quantity: product.quantity,
      };
      return productOrder;
    });

    const updateProducts = productsOrder.map(product => {
      return { id: product.product_id, quantity: product.quantity };
    });

    await this.productsRepository.updateQuantity(updateProducts);

    const order = await this.ordersRepository.create({
      customer,
      products: productsOrder,
    });

    return order;
  }
}

export default CreateOrderService;
