import { EntityRepository, Repository, getRepository } from 'typeorm';

import Category from '../models/Category';

@EntityRepository(Category)
class CategoryRepository extends Repository<Category> {
  public async getOrCreate(category: string): Promise<Category> {
    const categoryRepository = getRepository(Category);

    const existentCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    if (existentCategory) {
      return existentCategory;
    }

    const newCategory = categoryRepository.create({ title: category });
    await categoryRepository.save(newCategory);

    return newCategory;
  }
}

export default CategoryRepository;
