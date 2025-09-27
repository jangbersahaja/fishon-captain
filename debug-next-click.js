// Browser console debugging script
// Paste this into browser console to debug Next button click issues

console.log("=== DEBUGGING NEXT CLICK ISSUE ===");

// Check if debug mode is enabled
console.log(
  "Debug mode enabled:",
  process?.env?.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1" ||
    (typeof window !== "undefined" &&
      window.location.search.includes("debug=1"))
);

// Check current form state
const reactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
if (reactDevTools) {
  console.log("React DevTools available");
} else {
  console.log(
    "React DevTools NOT available - install React DevTools extension"
  );
}

// Function to inspect form state when called
window.debugFormState = function () {
  console.log("=== CURRENT FORM STATE ===");

  // Try to find form elements
  const form = document.querySelector("form");
  if (form) {
    console.log("Form found:", form);

    // Check for validation errors
    const errorElements = form.querySelectorAll(
      '[role="alert"], .error, .text-red-500, .text-red-600, .text-red-700'
    );
    console.log("Error elements found:", errorElements.length);
    errorElements.forEach((el, i) => {
      console.log(`Error ${i}:`, el.textContent, el);
    });

    // Check required fields
    const requiredFields = {
      "operator.displayName": document.querySelector(
        '[name="operator.displayName"]'
      ),
      "operator.experienceYears": document.querySelector(
        '[name="operator.experienceYears"]'
      ),
      "operator.bio": document.querySelector('[name="operator.bio"]'),
      "operator.phone": document.querySelector('[name="operator.phone"]'),
      charterName: document.querySelector('[name="charterName"]'),
      state: document.querySelector('[name="state"]'),
      city: document.querySelector('[name="city"]'),
    };

    console.log("Required field values:");
    Object.entries(requiredFields).forEach(([name, field]) => {
      if (field) {
        console.log(
          `${name}:`,
          field.value || "(empty)",
          field.validity?.valid ? "✅" : "❌"
        );
      } else {
        console.log(`${name}: field not found`);
      }
    });
  } else {
    console.log("No form found!");
  }

  // Check for Next button
  const nextButton =
    document.querySelector('button[type="submit"]') ||
    document.querySelector('button:contains("Next")') ||
    document.querySelector('[data-testid="next-button"]');
  console.log("Next button:", nextButton);
  if (nextButton) {
    console.log("Next button disabled:", nextButton.disabled);
    console.log("Next button text:", nextButton.textContent);
  }

  // Check for draft dev panel
  const devPanel =
    document.querySelector('[data-testid="draft-dev-panel"]') ||
    document.querySelector('div:contains("Draft Debug")');
  if (devPanel) {
    console.log("Dev panel found:", devPanel.textContent);
  } else {
    console.log("Dev panel not found - debug mode may not be enabled");
  }
};

// Function to simulate Next click with logging
window.debugNextClick = function () {
  console.log("=== SIMULATING NEXT CLICK ===");
  window.debugFormState();

  const nextButton =
    document.querySelector('button[type="submit"]') ||
    document.querySelector('button:contains("Next")');
  if (nextButton && !nextButton.disabled) {
    console.log("Clicking Next button...");
    nextButton.click();

    // Check for changes after a delay
    setTimeout(() => {
      console.log("=== AFTER NEXT CLICK ===");
      window.debugFormState();
    }, 1000);
  } else {
    console.log("Next button not found or disabled");
  }
};

console.log("Debugging functions loaded:");
console.log("- debugFormState() - inspect current form state");
console.log("- debugNextClick() - simulate Next click with logging");
console.log("Call debugFormState() to start debugging!");
