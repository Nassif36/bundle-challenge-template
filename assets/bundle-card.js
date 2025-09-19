class BundleCard extends HTMLElement {
  constructor() {
    super();
    this.swiper = null;

    // Cached elements
    this.swiperEl = null;
    this.swatches = null;
    this.sizePills = null;
    this.addToCartBtn = null;

    // State
    this.selectedOptions = {};
    this.currentVariantId = null;
  }

  connectedCallback() {
    this.swiperEl = this.querySelector('.bundle-card-swiper');
    this.swatches = this.querySelectorAll('.bundle-card__swatch');
    this.sizePills = this.querySelectorAll('.bundle-card__size-pill');
    this.addToCartBtn = this.querySelector('.bundle-card__add-to-cart');

    // Initialize Swiper
    if (this.swiperEl) {
      this.swiper = new Swiper(this.swiperEl, {
        slidesPerView: 1,
        direction: 'horizontal',
        spaceBetween: 16,
        navigation: {
          nextEl: this.swiperEl.querySelector('.swiper-button-next'),
          prevEl: this.swiperEl.querySelector('.swiper-button-prev'),
        },
        slidesPerGroup: 1,
      });
    }

    this.attachSwatchListeners();
    this.attachSizeListeners();
    this.attachAddToCart();

    if (this.swatches.length) this.swatches[0].click();
    if (this.sizePills.length) this.sizePills[0].click();
  }

  // -------------------------------
  // Color swatches
  // -------------------------------
  attachSwatchListeners() {
    this.swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        // Update visual selection
        this.swatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');

        const colorValue = swatch.querySelector('input')?.value || swatch.dataset.color;
        this.selectedOptions.color = colorValue;

        // Slide to image
        const mediaId = swatch.dataset.featuredMediaId;
        if (mediaId) {
          const slides = this.querySelectorAll('.swiper-slide');
          slides.forEach((slide, idx) => {
            if (slide.dataset.featuredMediaId === mediaId && this.swiper) {
              this.swiper.slideTo(idx);
            }
          });
        }

        this.updateCurrentVariant();
      });
    });
  }

  // -------------------------------
  // Size pills
  // -------------------------------
  attachSizeListeners() {
    this.sizePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        // Update visual selection
        this.sizePills.forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');

        const sizeValue = pill.querySelector('input')?.value || pill.textContent.trim();
        this.selectedOptions.size = sizeValue;

        this.updateCurrentVariant();
      });
    });
  }

  // -------------------------------
  // Resolve current variant
  // -------------------------------
  updateCurrentVariant() {
    const variantInputs = this.querySelectorAll('.bundle-card__variant-stock');
    const { color, size } = this.selectedOptions;

    let matchedVariant = null;

    variantInputs.forEach(input => {
      let match = true;
      if (color && input.dataset.color !== undefined) {
        match = match && input.dataset.color === color;
      }
      if (size && input.dataset.size !== undefined) {
        match = match && input.dataset.size === size;
      }
      if (match) matchedVariant = input;
    });

    if (matchedVariant) {
    this.currentVariantId = matchedVariant.dataset.variantId;

    const available = matchedVariant.dataset.available === "true";

    if (!available) {
      // Disable add to cart
      if (this.addToCartBtn) {
        this.addToCartBtn.disabled = true;
        this.addToCartBtn.textContent = "Sold Out";
      }
    } else {
      // Enable add to cart
      if (this.addToCartBtn) {
        this.addToCartBtn.disabled = false;
        this.addToCartBtn.textContent = "Add to Cart";
      }
    }
    }
  }

 


// -------------------------------
// Add to cart button (single call)
// -------------------------------
attachAddToCart() {
  if (!this.addToCartBtn) return;

  this.addToCartBtn.addEventListener('click', () => {
    if (!this.currentVariantId) {
      alert('Please select all options before adding to cart.');
      return;
    }

    // First product comes from fixed input (product.url)
    const firstProductInput = this.querySelector('.bundle-single_product');
    const firstProductUrl = firstProductInput?.value;

    if (!firstProductUrl) {
      console.error('❌ No first product URL found in .bundle-single_product');
      return;
    }

    fetch(firstProductUrl + '.js')
      .then(res => res.json())
      .then(productData => {
        const firstVariantId = productData.variants[0].id;

        const items = [
          { id: firstVariantId, quantity: 1, properties: { commonId: this.currentVariantId, isBundle: true} },
          { id: this.currentVariantId, quantity: 1, properties: { commonId: this.currentVariantId, isBundle: true}}
        ];

        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });
      })
      .then(res => res.json())
      .then(data => {
        publish(PUB_SUB_EVENTS.cartUpdate, { 
          source: 'quick-add', 
          cartData: data, 
          variantId: this.currentVariantId 
        });
      })
      .catch(err => console.error('❌ Add to cart failed:', err));
  });
}


}

customElements.define('bundle-card', BundleCard);
