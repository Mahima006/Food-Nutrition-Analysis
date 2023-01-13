const fs = require("fs");
const http = require("http");
const https = require("https");
const port = 3000;
const server = http.createServer();

const credentials = require("./credentials.json");

server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
    console.log(`Now Listening on Port ${port}`);
}

server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){
        const form = fs.createReadStream("html/text.html");
        res.writeHead(200, {"Content-Type": "text/html"})
        form.pipe(res);
    }
    else if (req.url === "/favicon.ico"){
        const favicon =fs.createReadStream('images/favicon.ico');
        res.writeHead(200, {"Content-Type" : "image/x-icon"});
        favicon.pipe(res);
    }
    else if(req.url === "/images/recipe.jpg"){
        const banner =fs.createReadStream('images/recipe.jpg');
        res.writeHead(200, { "Content-Type" : "image/jpeg"});
        banner.pipe(res);
    }
    else if (req.url.startsWith("/search")){
        let queryString = req.url;
        let recipe = queryString.substring(queryString.indexOf("=") + 1);
        get_recipe_information(recipe, res);
        if(recipe == null || recipe == ""){
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end("<h1>Missing Input</h1>");     
        }
    }
    else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end(`<h1>404 Not Found</h1>`);
    }
    

    function get_recipe_information(recipe){
        const recipe_endpoint = `https://api.edamam.com/api/recipes/v2?type=public&q=${recipe}&app_id=${credentials.recipes.app_id}&app_key=${credentials.recipes.app_key}`;
        const recipe_request = https.request(recipe_endpoint, {method:"GET"});
        recipe_request.once("response", process_stream); 
        recipe_request.end();
        //setTimeout( () => recipe_request.end(get_nutrition_information(recipe_data, recipe)) , 900);
        function process_stream (recipe_stream){
            let recipe_data = "";
            recipe_stream.on("data", chunk => recipe_data += chunk);
            recipe_stream.on("end", () => get_nutrition_information(recipe_data, recipe));
            //recipe_stream.on("end",recipe_request.end(()=>get_nutrition_information(recipe_data, recipe)));
        }
    }

    function get_nutrition_information(recipe_data, nutrition){
        const nutrition_endpoint = `https://api.edamam.com/api/nutrition-data?app_id=${credentials.nutrition.app_id}&app_key=${credentials.nutrition.app_key}&nutrition-type=logging&ingr=${nutrition}`;
        const nutrition_request = https.request(nutrition_endpoint, {method:"GET"});
        nutrition_request.once("response", process_stream);
        nutrition_request.end();
        //setTimeout( () => nutrition_request.end(serve_results(nutrition_data, recipe_data)) , 5000);
        function process_stream (nutrition_stream){
            let nutrition_data = ""; 
            nutrition_stream.on("data", chunk => nutrition_data += chunk);
            nutrition_stream.on("end", () => serve_results(nutrition_data, recipe_data));
            //nutrition_stream.on("end",nutrition_request.end(()=>serve_results(nutrition_data, recipe_data)));
        }
    }
    function serve_results(nutrition_data, recipe_data){
        let recipe_object = JSON.parse(recipe_data);
        let nutrition_object = JSON.parse(nutrition_data);
        let recipes = recipe_object && recipe_object.hits;
        let nutritions = nutrition_object;

        let recipe_results = recipes.map(format_recipe).join('');
        let nutrition_results = format_nutrition(nutritions);

        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(`<h1>Recipe Results:</h1><ul>${recipe_results}</ul><br><h2>Nutrition Analysis for Searched Recipe:</h2>${nutrition_results}`);
        
        function format_recipe (recipes){
            let recipe_descriptor = recipes && recipes.recipe;
            let url = recipe_descriptor && recipe_descriptor.uri;
            let label = recipe_descriptor && recipe_descriptor.label;
            let ingredient = recipe_descriptor && recipe_descriptor.ingredientLines;
            let type_meal = recipe_descriptor && recipe_descriptor.mealType;
            let type_cuisine = recipe_descriptor && recipe_descriptor.cuisineType;
            let type_dish = recipe_descriptor && recipe_descriptor.dishType;
            return `<li><a href="${url}"><a><p>${label}<br>Ingredients listed by measure: ${ingredient}<br>Meal Type: ${type_meal}<br>Cuisine Type: ${type_cuisine}<br>Dish Type: ${type_dish}</p></li>`; 
        }

        function format_nutrition(nutritions){
        let calorie = nutritions.calories;
        let weight= nutritions.totalWeight;
        let dietlabels = nutritions.dietLabels;
        let caution =nutritions.cautions;
        let healthlabels = nutritions.healthLabels;
        let total_energy = nutritions.totalNutrients.ENERC_KCAL.quantity;
        let total_fat = nutritions.totalNutrients.FAT.quantity;
        let total_fasat = nutritions.totalNutrients.FASAT.quantity;
        let total_sugar = nutritions.totalNutrients.SUGAR.quantity;
        let cholestrol = nutritions.totalNutrients.CHOLE.quantity;
        let calcium =nutritions.totalNutrients.CA.quantity;;;
        let magnesium = nutritions.totalNutrients.MG.quantity;
        let potassium =nutritions.totalNutrients.K.quantity;
        return `Calorie: ${calorie}<br>TotalWeight: ${weight}<br>DietLabels: ${dietlabels}<br>HealthLabels: ${healthlabels}<br> Cautions: ${caution}<br>Energy(kcal): ${total_energy}<br>
        Fat(gm): ${total_fat}<br> Fatty acids, total saturated(gm): ${total_fasat}<br>Sugar(gm): ${total_sugar}<br>Choloesterol(gm): ${cholestrol}<br>
        Calcium(gm): ${calcium}<br>Magnesium(gm): ${magnesium}<br>Potassium(gm): ${potassium}`;
        }
    }
}