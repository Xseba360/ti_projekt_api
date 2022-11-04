import { expect } from 'chai'
import { Category, CategoryManager } from '../src/CategoryManager.js'

describe('CategoryManager', function () {
  let testCategory: Category
  beforeEach(async function () {
    testCategory = await CategoryManager.createCategory({
      name: 'test',
    })
  })
  it('add category', async () => {
    const category = await CategoryManager.createCategory({
      name: 'Added Category',
    })
    expect(category.name).to.equal('Added Category')
  })
  it('get category', async () => {
    const foundCategory = await CategoryManager.getCategory(testCategory.uuid)
    expect(foundCategory.name).to.equal(testCategory.name)
  })
  it('update category', async () => {
    const updatedCategory = await CategoryManager.updateCategory(testCategory.uuid, {
      name: 'Updated Category',
    })
    expect(updatedCategory.name).to.equal('Updated Category')
  })
  it('delete category', async () => {
    const foundCategoryBefore = await CategoryManager.getCategory(testCategory.uuid)
    expect(foundCategoryBefore).to.not.equal(undefined)
    const deletedCategory = await CategoryManager.deleteCategory(testCategory.uuid)
    expect(deletedCategory).to.equal(true)
    const foundCategoryAfter = await CategoryManager.getCategory(testCategory.uuid)
    expect(foundCategoryAfter).to.equal(undefined)
  })
  it('get all categories', async () => {
    const EXPECTED_CATEGORY_COUNT = 10

    const categoriesBefore = await CategoryManager.getAllCategories()

    for (const category of categoriesBefore) {
      const isDeleted = await CategoryManager.deleteCategory(category.uuid)
      expect(isDeleted).to.equal(true)
    }
    const categoriesAfter = await CategoryManager.getAllCategories()
    expect(categoriesAfter.length).to.equal(0)

    for (let i = 1; i <= EXPECTED_CATEGORY_COUNT; i++) {
      await CategoryManager.createCategory({
        name: `New Category ${i}`,
      })
    }
    const allCategories = await CategoryManager.getAllCategories()
    expect(allCategories.length).to.equal(EXPECTED_CATEGORY_COUNT)
  })
})