// main.js

let globalRatingFormula = {price:0, walkability:0, square_foot:0, distance:0};

function showTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.style.display = 'none');

  const activeTab = document.getElementById(tabId);
  if (activeTab) {
    if (tabId === 'developer' && !window.isDeveloper) {
      alert("You must be the developer to access this page.");
      document.getElementById('home').style.display = 'block';
      return;
    }

    activeTab.style.display = 'block';

    // Update nav active state
    const navItems = document.querySelectorAll('nav ul li');
    navItems.forEach(item => item.classList.remove('active'));
    const linkItem = document.querySelector(`nav ul li a[href="#${tabId}"]`)?.parentElement;
    if (linkItem) linkItem.classList.add('active');

    if (tabId === 'saved') {
      displaySavedApartments();
    }

    if (tabId === 'developer' && window.isDeveloper) {
      fetchRatingFormula();
    }
  }
}

window.showTab = showTab;

function initHomeAutocomplete() {
  const homeInput = document.getElementById('homeCityInput');

  if (!homeInput) {
    console.error("homeCityInput not found");
    return;
  }

  console.log("Initializing home autocomplete...");
  const homeAutocomplete = new google.maps.places.Autocomplete(homeInput, {
    types: ['(cities)'],
    fields: ['geometry', 'name', 'formatted_address']
  });

  homeAutocomplete.addListener('place_changed', () => {
    const place = homeAutocomplete.getPlace();
    console.log("Place changed on home input:", place);
    if (!place.geometry || !place.geometry.location) {
      sessionStorage.removeItem('initialCenterLat');
      sessionStorage.removeItem('initialCenterLng');
      alert("Please select a city from the autocomplete suggestions.");
      return;
    }

    // Store selected city coordinates
    sessionStorage.setItem('initialCenterLat', place.geometry.location.lat());
    sessionStorage.setItem('initialCenterLng', place.geometry.location.lng());

    // Automatically navigate to maps tab
    console.log("City selected. Navigating to maps tab...");
    showTab('maps');

    // Recenter the map
    if (typeof recenterMap === 'function') {
      recenterMap(place.geometry.location.lat(), place.geometry.location.lng());
    } else {
      console.error("recenterMap function not defined in map.js");
    }
  });
}

window.searchCity = function() {
  const lat = sessionStorage.getItem('initialCenterLat');
  const lng = sessionStorage.getItem('initialCenterLng');

  if (!lat || !lng) {
    alert("Please select a city from the suggestions before searching.");
    return;
  }

  showTab('maps');

  // Recenter the map
  if (typeof recenterMap === 'function') {
    recenterMap(parseFloat(lat), parseFloat(lng));
  } else {
    console.error("recenterMap function not defined in map.js");
  }
};

// Initialize Autocomplete after Map is loaded
window.initMap = (function(originalInitMap) {
  return function() {
    if (typeof originalInitMap === 'function') {
      originalInitMap();
    }
    initHomeAutocomplete();
    fetchRatingFormula();
  };
})(window.initMap || function() {});

async function fetchRatingFormula() {
  try {
    const { data, error } = await supabase
      .from('rating_formula')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error("Error fetching rating formula:", error);
      return;
    }

    if (data) {
      globalRatingFormula = {
        price: data.price,
        walkability: data.walkability,
        square_foot: data.square_foot,
        distance: data.distance
      };

      if (window.isDeveloper) {
        document.getElementById('priceMetric').value = data.price;
        document.getElementById('walkabilityMetric').value = data.walkability;
        document.getElementById('squareFootMetric').value = data.square_foot;
        document.getElementById('distanceMetric').value = data.distance;
      }
    }
  } catch (err) {
    console.error("Unexpected error fetching rating formula:", err);
  }
}

window.updateRatingFormula = async function() {
  if (!window.isDeveloper) {
    alert("You must be a developer to update the formula.");
    return;
  }
  const price = parseInt(document.getElementById('priceMetric').value) || 0;
  const walkability = parseInt(document.getElementById('walkabilityMetric').value) || 0;
  const square_foot = parseInt(document.getElementById('squareFootMetric').value) || 0;
  const distance = parseInt(document.getElementById('distanceMetric').value) || 0;

  // Validate ranges
  if ([price, walkability, square_foot, distance].some(v => v < 0 || v > 25)) {
    alert("Each metric must be between 0 and 25.");
    return;
  }

  try {
    const { error } = await supabase
      .from('rating_formula')
      .update({ price, walkability, square_foot, distance })
      .eq('id', 1);

    if (error) {
      console.error("Error updating rating formula:", error);
      document.getElementById('formulaUpdateStatus').textContent = "Error updating formula.";
    } else {
      document.getElementById('formulaUpdateStatus').textContent = "Formula updated successfully!";
      globalRatingFormula = {price, walkability, square_foot, distance};
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    document.getElementById('formulaUpdateStatus').textContent = "Unexpected error updating formula.";
  }
}
