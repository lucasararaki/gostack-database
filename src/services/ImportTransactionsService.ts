import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import {
  getRepository,
  getCustomRepository,
  DeepPartial,
  In,
  TransactionRepository,
} from 'typeorm';

import CategoryRepository from '../repositories/CategoryRepository';
import TransactionsRepository from '../repositories/TransactionsRepository';

import CreateTransactionService from './CreateTransactionService';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  private filesPath = path.resolve(__dirname, '..', '..', 'tmp');

  createFileStream(filename: string): csvParse.Parser {
    const csvPath = path.resolve(this.filesPath, filename);

    const fileStream = fs.createReadStream(csvPath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parsedFileStram = fileStream.pipe(parseStream);

    return parsedFileStram;
  }

  async deleteFile(filename: string) {
    const csvPath = path.resolve(this.filesPath, filename);
    await fs.unlinkSync(csvPath);
  }

  /* async parseCSVDataToTransactionEntity(
    data: string[][],
  ): Promise<Transaction[]> {
    const categoryRepository = getCustomRepository(CategoryRepository);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactionsEntities: Transaction[] = [];

    data.forEach(async item => {
      const [title, type, value, category] = item;
      const verifiedType = type === 'income' ? 'income' : 'outcome';

      const { id: category_id } = await categoryRepository.getOrCreate(
        category,
      );

      const transaction: DeepPartial<Transaction> = {
        title,
        type: verifiedType,
        value: parseInt(value, 10),
        category_id,
      };

      const transactionEntity = transactionsRepository.create(transaction);
      transactionsEntities.push(transactionEntity);
    });

    return transactionsEntities;
  }

  async createTransactions(lines: string[][]): Promise<Transaction[]> {
    // const createTransactionService = new CreateTransactionService();
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactions: Transaction[] = [];

    const transactionsEntities = this.parseCSVDataToTransactionEntity(lines);

    await transactionsRepository.save(transactionsEntities);

    return transactions;
  } */

  async execute(filename: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const csvCategories: string[] = [];
    const csvTransactions: CSVTransaction[] = [];

    const parseCsv = this.createFileStream(filename);

    parseCsv.on('data', line => {
      const [title, type, value, category] = line;

      if (!title || !type || !value) return;

      csvCategories.push(category);
      csvTransactions.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCsv.on('end', () => {
        resolve();
      });
    });

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(csvCategories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = csvCategories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...existentCategories, ...newCategories];

    const createdTransactions = transactionsRepository.create(
      csvTransactions.map(transaction => {
        const { title, type, value, category: csvCategory } = transaction;
        const category = finalCategories.find(
          item => item.title === csvCategory,
        );
        return { title, type, value, category };
      }),
    );

    await transactionsRepository.save(createdTransactions);

    await this.deleteFile(filename);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
