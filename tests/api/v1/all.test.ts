import { expect } from 'chai'
import { Category } from '../../../src/CategoryManager.js'

import fetch from 'node-fetch'
import { dirname, importx } from '@discordx/importer'
import { Koa } from '@discordx/koa'
import dotenv from 'dotenv'
import { after } from 'mocha'
import { createHttpTerminator, HttpTerminator } from 'http-terminator'
import { Server } from 'http'
import { Product } from '../../../src/ProductManager.js'
import { UUID } from '../../../src/types/UUID.js'

dotenv.config()

async function CleanUpProducts () {
  // check if category exists
  const productsBefore = await fetch('http://localhost:3000/api/v1/products/getAll', {})

  const productsBeforeJson = await productsBefore.json()

  if (!IsValidApiResult(productsBeforeJson) || !Array.isArray(productsBeforeJson.products)) {
    expect.fail('Cleanup Error! Invalid API result or products is not an array')
    return
  }
  // delete all category
  for (const category of productsBeforeJson.products) {
    await fetch('http://localhost:3000/api/v1/products/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        uuid: category.uuid,
      })
    })
  }
}

async function CleanUpCategories () {
  // check if category exists
  const categoriesBefore = await fetch('http://localhost:3000/api/v1/categories/getAll', {})
  const categoriesBeforeJson = await categoriesBefore.json()

  if (!IsValidApiResult(categoriesBeforeJson) || !Array.isArray(categoriesBeforeJson.categories)) {
    expect.fail('Cleanup Error! Invalid API result or categories is not an array')
    return
  }
  // delete all category
  for (const category of categoriesBeforeJson.categories) {
    await fetch('http://localhost:3000/api/v1/categories/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        uuid: category.uuid,
      })
    })
  }
}

async function StartTestWebServer (portParam?: number): Promise<[Koa, Server]> {
  await importx(`${dirname(import.meta.url)}/../../../src/api/**/*.{ts,js}`)
  const app = new Koa()
  await app.build()
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not set')
  }
  const port = portParam ?? (process.env.PORT ?? 3000)
  let server: Server = await new Promise<Server>((resolve) => {
    const s = app.listen(port, () => {
      resolve(s)
    })
  })
  return [app, server]

}

function IsValidCategory (category: unknown): category is Category {
  return (
    typeof category === 'object' &&
    category !== null &&
    typeof (category as Category).uuid !== undefined &&
    typeof (category as Category).name !== undefined
  )
}

type ValidApiStatus = 'success' | 'error'
type ValidApiResultCategory = { status: ValidApiStatus; message?: string; category?: Category, categories?: Category[] }
type ValidApiResultProduct = { status: ValidApiStatus; message?: string; product?: Product, products?: Product[] }
type ValidApiResult = ValidApiResultCategory & ValidApiResultProduct

function IsValidProduct (product: unknown): product is Product {
  return (
    typeof product === 'object' &&
    product !== null &&
    typeof (product as Product).uuid !== undefined &&
    typeof (product as Product).name !== undefined &&
    typeof (product as Product).description !== undefined &&
    typeof (product as Product).price !== undefined &&
    typeof (product as Product).category !== undefined
  )
}

function IsValidApiResult (result: unknown): result is ValidApiResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    typeof (result as ValidApiResult).status !== undefined &&
    (result as ValidApiResult).status === 'success' || (result as ValidApiResult).status === 'error'
  )
}

describe('Web API', function () {
  let app: Koa
  let server: Server
  let httpTerminator: HttpTerminator
  before(async function () {
    [app, server] = (await StartTestWebServer())
    try {
      await CleanUpCategories()
      await CleanUpProducts()
    }
    catch (e) {
      if (e instanceof SyntaxError) {
        expect.fail('Invalid JSON')
        return
      }
    }
  })

  let createResultJsonProduct: ValidApiResultProduct
  let createResultJson: ValidApiResultCategory

  beforeEach(async function () {
    const createResult = await fetch('http://localhost:3000/api/v1/categories/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        category: {
          name: 'test',
        }
      })
    })
    expect(createResult.status).to.equal(200)
    let resultJson
    try {
      resultJson = await createResult.json()
    } catch (e) {
      expect.fail('Invalid JSON')
      return
    }
    if (!IsValidApiResult(resultJson)) {
      expect.fail('Invalid API result')
      return
    }
    if (!IsValidCategory(resultJson.category)) {
      expect.fail('Resulting category is not a valid category.')
      return
    }
    // expect(resultJson.status).to.equal('success')
    // expect(resultJson.category.name).to.equal('test')
    createResultJson = resultJson

    const createResultProduct = await fetch('http://localhost:3000/api/v1/products/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        product: {
          name: 'A Test Product',
          description: 'Test Description',
          price: 1,
          category: 'test',
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
          ],
        }
      })
    })
    expect(createResultProduct.status).to.equal(200)
    let resultJsonProduct
    try {
      resultJsonProduct = await createResultProduct.json()
    } catch (e) {
      expect.fail('Invalid JSON')
      return
    }
    if (!IsValidApiResult(resultJsonProduct)) {
      expect.fail('Invalid API result')
      return
    }
    if (!IsValidProduct(resultJsonProduct.product)) {
      expect.fail('Resulting product is not a valid product.')
      return
    }
    createResultJsonProduct = resultJsonProduct
  })

  it('invalid api key', async function () {
    const result = await fetch('http://localhost:3000/api/v1/categories/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: 'invalid',
        category: {
          name: 'test',
        }
      })
    })
    const resultJson = await result.json()
    if (!IsValidApiResult(resultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(resultJson.status).to.equal('error')
    expect(resultJson.message).to.equal('Unauthorized')
  })

  it('add category', async () => {
    const createResultAdd = await fetch('http://localhost:3000/api/v1/categories/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        category: {
          name: 'Added Category',
        }
      })
    })
    const createResultJsonAdd = await createResultAdd.json()
    if (!IsValidApiResult(createResultJsonAdd)) {
      expect.fail('Invalid API result')
      return
    }
    if (!IsValidCategory(createResultJsonAdd.category)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    expect(createResultJsonAdd.status).to.equal('success')
    expect(createResultJsonAdd.category.name).to.equal('Added Category')
  })

  it('get category', async () => {
    if (!IsValidCategory(createResultJson.category)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    const getResult = await fetch('http://localhost:3000/api/v1/categories/get/' + createResultJson.category.uuid, {})
    const getResultJson = await getResult.json()
    if (!IsValidApiResult(getResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultJson.status).to.equal('success')
    if (!IsValidCategory(getResultJson.category)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    expect(getResultJson.category.name).to.equal(createResultJson.category.name)
  })

  it('get category - missing uuid', async () => {
    const getResult = await fetch('http://localhost:3000/api/v1/categories/get/', {})
    const getResultJson = await getResult.json()
    if (!IsValidApiResult(getResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultJson.status).to.equal('error')
    expect(getResultJson.message).to.equal('Missing category UUID')
  })

  it('update category', async () => {
    if (!IsValidCategory(createResultJson.category)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    const updateResult = await fetch('http://localhost:3000/api/v1/categories/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        category: {
          uuid: createResultJson.category.uuid,
          name: 'Updated Category',
        }
      })
    })
    const updateResultJson = await updateResult.json()
    if (!IsValidApiResult(updateResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    if (!IsValidCategory(updateResultJson.category)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    expect(updateResultJson.category.name).to.equal('Updated Category')
  })

  it('update category - missing uuid', async () => {
    const updateResult = await fetch('http://localhost:3000/api/v1/categories/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        category: {
          name: 'Updated Category',
        }
      })
    })
    const updateResultJson = await updateResult.json()
    if (!IsValidApiResult(updateResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(updateResultJson.status).to.equal('error')
    expect(updateResultJson.message).to.equal('Missing category or UUID')
  })

  it('delete category', async () => {
    if (!IsValidCategory(createResultJson.category)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    // check if category exists
    const getResultBefore = await fetch('http://localhost:3000/api/v1/categories/get/' + createResultJson.category.uuid, {})
    const getResultBeforeJson = await getResultBefore.json()
    if (!IsValidApiResult(getResultBeforeJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultBeforeJson.status).to.equal('success')
    if (!IsValidCategory(getResultBeforeJson.category)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    expect(getResultBeforeJson.category.name).to.equal(createResultJson.category.name)

    // delete category
    const deleteResult = await fetch('http://localhost:3000/api/v1/categories/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        uuid: getResultBeforeJson.category.uuid,
      })
    })
    const deleteResultJson = await deleteResult.json()
    if (!IsValidApiResult(deleteResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(deleteResultJson.status).to.equal('success')

    // check if category still exists
    const getResultAfter = await fetch('http://localhost:3000/api/v1/categories/get/' + createResultJson.category.uuid, {})
    const getResultAfterJson = await getResultAfter.json()
    if (!IsValidApiResult(getResultAfterJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultAfterJson.status).to.equal('error')
    expect(getResultAfterJson.message).to.equal('Category not found')
  })

  it('delete category - missing uuid', async () => {
    // delete category
    const deleteResult = await fetch('http://localhost:3000/api/v1/categories/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
      })
    })
    const deleteResultJson = await deleteResult.json()
    if (!IsValidApiResult(deleteResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(deleteResultJson.status).to.equal('error')
    expect(deleteResultJson.message).to.equal('Missing category UUID')
  })

  it('get all categories', async () => {
    const EXPECTED_CATEGORY_COUNT = 10

    // check if category exists
    const categoriesBefore = await fetch('http://localhost:3000/api/v1/categories/getAll', {})
    const categoriesBeforeJson = await categoriesBefore.json()
    if (!IsValidApiResult(categoriesBeforeJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(categoriesBeforeJson.status).to.equal('success')
    if (!Array.isArray(categoriesBeforeJson.categories)) {
      expect.fail('categories is not an array')
      return
    }

    // delete all category
    for (const category of categoriesBeforeJson.categories) {
      const deleteResult = await fetch('http://localhost:3000/api/v1/categories/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: process.env.API_KEY,
          uuid: category.uuid,
        })
      })
      const deleteResultJson = await deleteResult.json()
      if (!IsValidApiResult(deleteResultJson)) {
        expect.fail('Invalid API result')
        return
      }
      expect(deleteResultJson.status).to.equal('success')
    }
    const categoriesAfter = await fetch('http://localhost:3000/api/v1/categories/getAll', {})
    const categoriesAfterJson = await categoriesAfter.json()
    if (!IsValidApiResult(categoriesAfterJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(categoriesAfterJson.status).to.equal('success')
    if (!Array.isArray(categoriesAfterJson.categories)) {
      expect.fail('categories is not an array')
      return
    }
    expect(categoriesAfterJson.categories.length).to.equal(0)

    for (let i = 1; i <= EXPECTED_CATEGORY_COUNT; i++) {
      const createResultAdd = await fetch('http://localhost:3000/api/v1/categories/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: process.env.API_KEY,
          category: {
            name: `New Category ${i}`,
          }
        })
      })
      const createResultJsonAdd = await createResultAdd.json()
      if (!IsValidApiResult(createResultJsonAdd) || !IsValidCategory(createResultJsonAdd.category)) {
        expect.fail('Invalid API result or resulting category is not a valid category')
        return
      }
      expect(createResultJsonAdd.status).to.equal('success')
      expect(createResultJsonAdd.category.name).to.equal(`New Category ${i}`)
    }
    // check if products exist
    const allCategories = await fetch('http://localhost:3000/api/v1/categories/getAll', {})
    const allCategoriesJson = await allCategories.json()
    if (!IsValidApiResult(allCategoriesJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(allCategoriesJson.status).to.equal('success')
    if (!Array.isArray(allCategoriesJson.categories)) {
      expect.fail('products is not an array')
      return
    }
    expect(allCategoriesJson.categories.length).to.equal(EXPECTED_CATEGORY_COUNT)
  })

  it('invalid api key', async () => {
    const result = await fetch('http://localhost:3000/api/v1/products/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: 'invalid',
        product: {
          name: 'A Test Product',
          description: 'Test Description',
          price: 1,
          category: 'test',
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
          ],
        }
      })
    })
    const resultJson = await result.json()
    if (!IsValidApiResult(resultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(resultJson.status).to.equal('error')
    expect(resultJson.message).to.equal('Unauthorized')
  })

  it('add product', async () => {
    const createResultAdd = await fetch('http://localhost:3000/api/v1/products/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        product: {
          name: 'Another Test Product',
          description: 'Another Test Description',
          price: 100,
          category: 'test-test',
          photos: [
            'https://example.com/photo1.jpg',
            'https://example.com/photo2.jpg',
          ],
        }
      })
    })
    const createResultJsonAdd = await createResultAdd.json()
    if (!IsValidApiResult(createResultJsonAdd)) {
      expect.fail('Invalid API result')
      return
    }
    if (!IsValidProduct(createResultJsonAdd.product)) {
      expect.fail('resulting product is not a valid product')
      return
    }
    expect(createResultJsonAdd.status).to.equal('success')
    expect(createResultJsonAdd.product.name).to.equal('Another Test Product')
  })

  it('get product', async () => {
    if (!IsValidProduct(createResultJsonProduct.product)) {
      expect.fail('resulting product is not a valid product')
      return
    }
    const getResult = await fetch('http://localhost:3000/api/v1/products/get/' + createResultJsonProduct.product.uuid, {})
    const getResultJson = await getResult.json()
    if (!IsValidApiResult(getResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultJson.status).to.equal('success')
    if (!IsValidProduct(getResultJson.product)) {
      expect.fail('resulting product is not a valid product')
      return
    }
    expect(getResultJson.product.name).to.equal(createResultJsonProduct.product.name)
  })

  it('get product - missing uuid', async () => {
    const getResult = await fetch('http://localhost:3000/api/v1/products/get/', {})
    const getResultJson = await getResult.json()
    if (!IsValidApiResult(getResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultJson.status).to.equal('error')
    expect(getResultJson.message).to.equal('Missing product UUID')
  })

  it('update product', async () => {
    if (!IsValidProduct(createResultJsonProduct.product)) {
      expect.fail('resulting product is not a valid category')
      return
    }
    const updateResult = await fetch('http://localhost:3000/api/v1/products/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        product: {
          uuid: createResultJsonProduct.product.uuid,
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
        }
      })
    })
    const updateResultJson = await updateResult.json()
    if (!IsValidApiResult(updateResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    if (!IsValidProduct(updateResultJson.product)) {
      expect.fail('resulting product is not a valid product')
      return
    }
    expect(updateResultJson.product.name).to.equal('Updated Test Product')
    expect(updateResultJson.product.description).to.equal('Updated Test Description')
    expect(updateResultJson.product.price).to.equal(200)
    expect(updateResultJson.product.category).to.equal('test-test-updated')
    expect(updateResultJson.product.photos.length).to.equal(4)
  })

  it('update product - missing uuid', async () => {
    const updateResult = await fetch('http://localhost:3000/api/v1/products/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        product: {
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
        }
      })
    })
    const updateResultJson = await updateResult.json()
    if (!IsValidApiResult(updateResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(updateResultJson.status).to.equal('error')
    expect(updateResultJson.message).to.equal('Missing product or UUID')
  })

  it('delete product', async () => {
    if (!IsValidProduct(createResultJsonProduct.product)) {
      expect.fail('resulting product is not a valid product')
      return
    }
    // check if product exists
    const getResultBefore = await fetch('http://localhost:3000/api/v1/products/get/' + createResultJsonProduct.product.uuid, {})
    const getResultBeforeJson = await getResultBefore.json()
    if (!IsValidApiResult(getResultBeforeJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultBeforeJson.status).to.equal('success')
    if (!IsValidProduct(getResultBeforeJson.product)) {
      expect.fail('resulting category is not a valid category')
      return
    }
    expect(getResultBeforeJson.product.name).to.equal(createResultJsonProduct.product.name)

    // delete product
    const deleteResult = await fetch('http://localhost:3000/api/v1/products/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
        uuid: getResultBeforeJson.product.uuid,
      })
    })
    const deleteResultJson = await deleteResult.json()
    if (!IsValidApiResult(deleteResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(deleteResultJson.status).to.equal('success')

    // check if product still exists
    const getResultAfter = await fetch('http://localhost:3000/api/v1/products/get/' + createResultJsonProduct.product.uuid, {})
    const getResultAfterJson = await getResultAfter.json()
    if (!IsValidApiResult(getResultAfterJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(getResultAfterJson.status).to.equal('error')
    expect(getResultAfterJson.message).to.equal('Product not found')
  })

  it('delete product - missing uuid', async () => {
    // delete product
    const deleteResult = await fetch('http://localhost:3000/api/v1/products/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: process.env.API_KEY,
      })
    })
    const deleteResultJson = await deleteResult.json()
    if (!IsValidApiResult(deleteResultJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(deleteResultJson.status).to.equal('error')
    expect(deleteResultJson.message).to.equal('Missing product UUID')
  })

  it('get all products', async () => {
    const EXPECTED_PRODUCT_COUNT = 10

    // check if products exist
    const productsBefore = await fetch('http://localhost:3000/api/v1/products/getAll', {})
    const productsBeforeJson = await productsBefore.json()
    if (!IsValidApiResult(productsBeforeJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(productsBeforeJson.status).to.equal('success')
    if (!Array.isArray(productsBeforeJson.products)) {
      expect.fail('products is not an array')
      return
    }

    // delete all products
    for (const product of productsBeforeJson.products) {
      const deleteResult = await fetch('http://localhost:3000/api/v1/products/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: process.env.API_KEY,
          uuid: product.uuid,
        })
      })
      const deleteResultJson = await deleteResult.json()
      if (!IsValidApiResult(deleteResultJson)) {
        expect.fail('Invalid API result')
        return
      }
      expect(deleteResultJson.status).to.equal('success')
    }
    const productsAfter = await fetch('http://localhost:3000/api/v1/products/getAll', {})
    const productsAfterJson = await productsAfter.json()
    if (!IsValidApiResult(productsAfterJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(productsAfterJson.status).to.equal('success')
    if (!Array.isArray(productsAfterJson.products)) {
      expect.fail('products is not an array')
      return
    }
    expect(productsAfterJson.products.length).to.equal(0)

    for (let i = 1; i <= EXPECTED_PRODUCT_COUNT; i++) {
      const createResultAdd = await fetch('http://localhost:3000/api/v1/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: process.env.API_KEY,
          product: {
            name: `New Test Product ${i}`,
            description: `New Test Description ${i}`,
            price: 100 + i * 10,
            category: `test-test-${i}`,
            photos: [
              'https://example.com/photo1.jpg',
            ],
          }
        })
      })
      const createResultJsonAdd = await createResultAdd.json()
      if (!IsValidApiResult(createResultJsonAdd) || !IsValidProduct(createResultJsonAdd.product)) {
        expect.fail('Invalid API result or resulting product is not a valid product')
        return
      }
      expect(createResultJsonAdd.status).to.equal('success')
      expect(createResultJsonAdd.product.name).to.equal(`New Test Product ${i}`)
    }
    // check if products exist
    const allProducts = await fetch('http://localhost:3000/api/v1/products/getAll', {})
    const allProductsJson = await allProducts.json()
    if (!IsValidApiResult(allProductsJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(allProductsJson.status).to.equal('success')
    if (!Array.isArray(allProductsJson.products)) {
      expect.fail('products is not an array')
      return
    }
    expect(allProductsJson.products.length).to.equal(EXPECTED_PRODUCT_COUNT)
  })
  it('get recommended products', async () => {
    const EXPECTED_PRODUCT_COUNT = 6

    // clean up all products
    const productsBefore = await fetch('http://localhost:3000/api/v1/products/getAll', {})
    const productsBeforeJson = await productsBefore.json()
    if (!IsValidApiResult(productsBeforeJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(productsBeforeJson.status).to.equal('success')
    if (!Array.isArray(productsBeforeJson.products)) {
      expect.fail('products is not an array')
      return
    }
    for (const product of productsBeforeJson.products) {
      const deleteResult = await fetch('http://localhost:3000/api/v1/products/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: process.env.API_KEY,
          uuid: product.uuid,
        })
      })
      const deleteResultJson = await deleteResult.json()
      if (!IsValidApiResult(deleteResultJson)) {
        expect.fail('Invalid API result')
        return
      }
      expect(deleteResultJson.status).to.equal('success')
    }
    const productsAfter = await fetch('http://localhost:3000/api/v1/products/getAll', {})
    const productsAfterJson = await productsAfter.json()
    if (!IsValidApiResult(productsAfterJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(productsAfterJson.status).to.equal('success')
    if (!Array.isArray(productsAfterJson.products)) {
      expect.fail('products is not an array')
      return
    }
    expect(productsAfterJson.products.length).to.equal(0)

    for (let i = 1; i <= EXPECTED_PRODUCT_COUNT; i++) {
      const createResultAdd = await fetch('http://localhost:3000/api/v1/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: process.env.API_KEY,
          product: {
            name: `Recommended Product ${i}`,
            description: `New Recommended Description ${i}`,
            price: 100 + i * 10,
            category: `recommend-test-test-${i}`,
            photos: [
              'https://example.com/photo1.jpg',
            ],
          }
        })
      })
      const createResultJsonAdd = await createResultAdd.json()
      if (!IsValidApiResult(createResultJsonAdd) || !IsValidProduct(createResultJsonAdd.product)) {
        expect.fail('Invalid API result or resulting product is not a valid product')
        return
      }
      expect(createResultJsonAdd.status).to.equal('success')
      expect(createResultJsonAdd.product.name).to.equal(`Recommended Product ${i}`)
    }
    // check if products exist
    const allProducts = await fetch('http://localhost:3000/api/v1/products/getAll', {})
    const allProductsJson = await allProducts.json()
    if (!IsValidApiResult(allProductsJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(allProductsJson.status).to.equal('success')
    if (!Array.isArray(allProductsJson.products)) {
      expect.fail('products is not an array')
      return
    }
    expect(allProductsJson.products.length).to.equal(EXPECTED_PRODUCT_COUNT)

    // check if products exist
    const recommendedProducts = await fetch('http://localhost:3000/api/v1/products/getRecommended/6', {})
    const recommendedProductsJson = await recommendedProducts.json()
    if (!IsValidApiResult(recommendedProductsJson)) {
      expect.fail('Invalid API result')
      return
    }
    expect(recommendedProductsJson.status).to.equal('success')
    if (!Array.isArray(recommendedProductsJson.products)) {
      expect.fail('products is not an array')
      return
    }
    expect(recommendedProductsJson.products.length).to.equal(EXPECTED_PRODUCT_COUNT)

    const recommendedProductsJsonMap = new Map<UUID, Product>()
    for (const product of recommendedProductsJson.products) {
      recommendedProductsJsonMap.set(product.uuid, product)
    }
    for (const product of allProductsJson.products) {
      expect(recommendedProductsJsonMap.get(product.uuid)).to.not.equal(undefined)
      expect(recommendedProductsJsonMap.get(product.uuid)?.name).to.equal(product.name)
      expect(recommendedProductsJsonMap.get(product.uuid)?.description).to.equal(product.description)
      expect(recommendedProductsJsonMap.get(product.uuid)?.price).to.equal(product.price)
      expect(recommendedProductsJsonMap.get(product.uuid)?.category).to.equal(product.category)
      expect(recommendedProductsJsonMap.get(product.uuid)?.photos.length).to.equal(product.photos.length)
    }

  })

  after(async () => {
    try {
      await CleanUpCategories()
      await CleanUpProducts()
    } catch (e) {
      if (e instanceof SyntaxError) {
        httpTerminator = createHttpTerminator({ server })
        await httpTerminator.terminate()
        expect.fail('Invalid JSON')
        return
      }
    }
    httpTerminator = createHttpTerminator({ server })
    await httpTerminator.terminate()
  })
})