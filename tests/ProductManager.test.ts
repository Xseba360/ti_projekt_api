import { expect } from 'chai'
import { Product, ProductManager } from '../src/ProductManager.js'

describe('ProductManager', function () {
  let testProduct: Product
  beforeEach(async function () {
    testProduct = await ProductManager.createProduct({
      name: 'A Test Product',
      description: 'Test Description',
      price: 1,
      category: 'test',
      photos: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
      ],
    })
  })
  it('add product', async () => {
    const product = await ProductManager.createProduct({
      name: 'Another Test Product',
      description: 'Another Test Description',
      price: 100,
      category: 'test-test',
      photos: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
      ],
    })
    expect(product.name).to.equal('Another Test Product')
  })
  it('get product', async () => {
    const foundProduct = await ProductManager.getProduct(testProduct.uuid)
    expect(foundProduct).to.not.be.undefined
    expect(foundProduct?.name).to.equal(testProduct.name)
  })
  it('update product', async () => {
    const updatedProduct = await ProductManager.updateProduct(testProduct.uuid, {
      name: 'Updated Test Product',
      description: 'Updated Test Description',
      price: 200,
      category: 'test-test-updated',
      photos: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
        'https://example.com/photo4.jpg',
      ],
    })
    expect(updatedProduct.name).to.equal('Updated Test Product')
    expect(updatedProduct.description).to.equal('Updated Test Description')
    expect(updatedProduct.price).to.equal(200)
    expect(updatedProduct.category).to.equal('test-test-updated')
    expect(updatedProduct.photos.length).to.equal(4)
  })
  it('delete product', async () => {
    const foundProductBefore = await ProductManager.getProduct(testProduct.uuid)
    expect(foundProductBefore).to.not.equal(undefined)
    const deletedProduct = await ProductManager.deleteProduct(testProduct.uuid)
    expect(deletedProduct).to.equal(true)
    const foundProductAfter = await ProductManager.getProduct(testProduct.uuid)
    expect(foundProductAfter).to.equal(undefined)
  })
  it('get all products', async () => {
    const EXPECTED_PRODUCT_COUNT = 10

    const productsBefore = await ProductManager.getAllProducts()

    for (const product of productsBefore) {
      const isDeleted = await ProductManager.deleteProduct(product.uuid)
      expect(isDeleted).to.equal(true)
    }
    const productsAfter = await ProductManager.getAllProducts()
    expect(productsAfter.length).to.equal(0)

    for (let i = 1; i <= EXPECTED_PRODUCT_COUNT; i++) {
      await ProductManager.createProduct({
        name: `New Test Product ${i}`,
        description: `New Test Description ${i}`,
        price: 100 + i*10,
        category: `test-test-${i}`,
        photos: [
          'https://example.com/photo1.jpg',
        ],
      })
    }
    const allProducts = await ProductManager.getAllProducts()
    expect(allProducts.length).to.equal(EXPECTED_PRODUCT_COUNT)
  })
})