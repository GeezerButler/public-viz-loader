// @ts-check

//Learnings
//1. Always have explciti timeout in any wait or click action
//2. Parallel tabs are tempting but take massive memory and lots of context switching
//3. Take screenshots when you face errors. Helps in debugging

module.exports = { readFlow };

const { test, expect } = require('@playwright/test');

test('read flow', async ({ page }) => readFlow(page));

const search_keywords = ['America', 'Canada', 'India', 'Japan', 'Singapore', 'England', 'Australia', 'Italy', 'Germany', 'Spain'
,'Argentina', 'Chile', 'Brazil', 'China', 'Ukraine', 'Russia', 'Turkey', 'Pakistan', 'Bhutan', 'Morocco', 'Sweden', 'Denmark',
'Egypt', 'Mexico', 'Iraq', 'Nigeria', 'Cuba', 'England', 'France', 'Greece', 'Phillipines', 'Poland'];

const baseUrl = 'https://public.tableau.com';

async function readFlow(page) {
  console.log(`starting readFlow`);

  const context = page.context();

  await page.goto(baseUrl, { timeout: 5000 });
  console.log(`done with home page`);

  //accept the cookies OR click the welcome banner
  const cookiesBanner = page.getByRole('button', { name: "Accept All Cookies" });
  const welcomeBanner = page.getByTestId('WelcomeBanner');
  try {
    await Promise.any([cookiesBanner.click({ timeout: 5000 }), welcomeBanner.click({ timeout: 5000 })]);
    console.log(`done with accepting cookies`);
  } catch (error) {
    console.log(`could not click cookie or banner`);
    await page.screenshot({ path: './screenshots/homepage.png' });
    throw error;
  }

  // Find viz of the day and click it
  const VizOfTheDayCard = page.getByTestId("VizOfTheDayCard-title");
  await gotoVizhomeAndBack(VizOfTheDayCard, page);
  console.log(`done with viz of the day`);

  //choose random search terms and perform the search
  const searchKeyword = search_keywords[Math.floor(Math.random() * search_keywords.length)]

  let keepSearching = true;
  let pageNum = 0;
  let vizLoadSuccess = 0;
  let vizLoadFailure = 0;
  const startTime  = Date.now();
  while (keepSearching) {
    pageNum = pageNum + 1;
    const searchUrl = encodeURI(`https://public.tableau.com/app/search/vizzes/${searchKeyword}?page=${pageNum}`);
    console.log(searchUrl);
    await page.goto(searchUrl);

    //Wait for atleast 1 search result OR the message that says that no results are available
    const vizCards = page.getByTestId('VizCard');
    const noResults = page.getByText('No results found.');
    try {
      await Promise.any([vizCards.first().waitFor({ timeout: 10000 }), noResults.waitFor({ timeout: 10000 })]);
    } catch (error) {
      console.log(`skipping search page ${pageNum} due to timeout`)
      await page.screenshot({ path: './screenshots/searchError.png' });  
      continue;
    }

    //visit every viz and every author profile on this page of the search result
    const numResultsOnPage = await vizCards.count();
    console.log(`Got ${numResultsOnPage} search results`);

    for (let i=0; i<numResultsOnPage; i++) {
      //every vizcard has 3 links, 1st and 2nd are the viz and 3rd is the author profile
      const vizHref = await vizCards.nth(i).getByRole('link').first().getAttribute('href');
      const success = await gotoVizhomeInNewTab(vizHref, context);
      if (success) {
        vizLoadSuccess++;
      } else {
        vizLoadFailure++;
      }
      console.log(`vizLoadSuccess = ${vizLoadSuccess}, vizLoadFailure = ${vizLoadFailure}`);
    }

    keepSearching = (numResultsOnPage >= 20);

    const vizLoadRate = ((vizLoadSuccess + vizLoadFailure) * 1000) / (Date.now() - startTime);
    console.log(`viz load rate = ${vizLoadRate} per second`);
  }
}

async function gotoVizhomeAndBack(locator, page) {
  await locator.click();

  //make sure the viz is loaded completely inside the iframe
  const frameLoc = page.getByTitle("Data Visualization").frameLocator(':scope');
  /* Using #centeringContainer is a little brittle because Vizql team can change the id,
  but it's definitely better than waiting for a constant timeout */ 
  await frameLoc.locator("#centeringContainer").click();

  //go back to previous page
  await page.goBack();
}

async function gotoVizhomeInNewTab(href, context) {
  const newTab = await context.newPage();

  await newTab.goto(baseUrl + href);

  //make sure the viz is loaded completely inside the iframe
  const frameLoc = newTab.getByTitle("Data Visualization").frameLocator(':scope');
  /* Using #centeringContainer is a little brittle because Vizql team can change the id,
  but it's definitely better than waiting for a constant timeout */ 
  try {
    await frameLoc.locator("#centeringContainer").click({ timeout: 15000 });
  } catch (error) {
    console.error(error);
    
    // screenshot for debugging
    await newTab.screenshot({ path: "./screenshots/" + href.replaceAll('/', '_') + '.png' });  
    
    return false;
  } finally {
    //close tab
    await newTab.close();
  }
  return true;
}