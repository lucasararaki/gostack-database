import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

import CategoryRepository from '../repositories/CategoryRepository';
import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: string;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    if (!(type === 'income' || type === 'outcome')) {
      throw new AppError('Invalid type');
    }

    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getCustomRepository(CategoryRepository);

    if (type === 'outcome') {
      const balance = await transactionsRepository.getBalance();

      if (balance.total <= 0 || value > balance.total) {
        throw new AppError('Not have balance for outcome');
      }
    }

    const { id: category_id } = await categoryRepository.getOrCreate(category);

    const newTransaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id,
    });

    await transactionsRepository.save(newTransaction);

    return newTransaction;
  }
}

export default CreateTransactionService;
