var currentTransform = "move";
var currentShape = "Rectangle";
var obj;
var canvas;
var ctx;
var initialMousePos;
var isSelectionOn;

var rect;
var selectionGroup;

var allShapes = [];
var inSceneShapes = [];


function epsilon(value, range)
{
    if(value > -range && value < range )  return 0;
    if(value > (1 - range) && value < (1 + range)) return 1;
    if(value < (range - 1) && value > (-1 - range)) return -1; 

    return value;
}


class ITransformable {
    
    constructor(position)
    {
        if(!arguments.length) {}
        else
        {
            var rotationMatrix = mat3();
    
            rotationMatrix[1][1] = -1;
    
            var translationMatrix = mat3();
            var scaleMatrix = mat3();
    
            translationMatrix[0][2] = position[0];
            translationMatrix[1][2] = position[1];
    
            this.transform = mult(translationMatrix, mult(rotationMatrix, scaleMatrix));    
            this.defaultTransform = mat3(this.transform);
        }
    
    }

    setPosition(newPos)
    {
        this.transform[0][2] = newPos[0];
        this.transform[1][2] = newPos[1];
    }

    getPosition()
    {
        return vec2(this.transform[0][2], this.transform[1][2]);
    }

    getXAxis()
    {
        return vec2(this.transform[0][0],this.transform[1][0]);
    }

    getYAxis()
    {
        return vec2(this.transform[0][1],this.transform[1][1]);
    }

};


class Shape extends ITransformable {

    constructor(position, vertices, color)
    {
        if(!arguments.length) {
           super();
        }
        else
        {
            super(position);
            this.vertices = vertices;
            this.color = color;
        }

    }


    inBound(pos)
    {
        var globalVerts = this.transformVertsToWorld(this.vertices);

        globalVerts.push(globalVerts[0]);

        for(var i = 0; i < globalVerts.length - 1; i++)
        {
            var distVec = subtract(globalVerts[i + 1], globalVerts[i]);
            var halfDist = scale(.5, distVec);

            var midpoint = add(globalVerts[i], halfDist);

            var posToMid = subtract(pos, midpoint);
            var orthDistVec = vec2(-distVec[1], distVec[0]);

            if(dot(posToMid, orthDistVec) < 0)
            {
                return false;
            }
        }
        
        return true;
    }

    fromJSON(obj)
    {
        this.color = obj.color;
        this.transform =  mat3(obj.transform.flat());

        this.vertices = obj.vertices;

        for(var i = 0; i < this.vertices.length; i++)
        {
            this.vertices[i] = vec2(this.vertices[i]);
        }


    }

    toJSON()
    {
        return {
            color: this.color,
            transform: this.transform,
            vertices: this.vertices
        }
    }

    clone(shape)
    {
        shape.vertices = JSON.parse(JSON.stringify(this.vertices));

        for(var i = 0; i < shape.vertices.length; i++)
        {
            shape.vertices[i] = vec2(shape.vertices[i]);
        }

        shape.color = this.color;
        shape.transform = mat3(JSON.parse(JSON.stringify(this.transform)).flat());
        console.log(shape.transform);
    }

    moveShape(offsetVec)
    {
        this.transform[0][2] = this.transform[0][2] + offsetVec[0];
        this.transform[1][2] = this.transform[1][2] + offsetVec[1];
    }

    scaleShape(scaleAmt)
    {
        var normX = normalize(this.getXAxis());
        var normY = normalize(this.getYAxis());         


        var newX = scale(scaleAmt, normX);
        var newY = scale(scaleAmt, normY);

        this.transform[0][0] = newX[0];
        this.transform[1][0] = newX[1];

        this.transform[0][1] = newY[0];
        this.transform[1][1] = newY[1];
    }  

    scaleShapeX(scaleAmt)
    {
        var normX = normalize(this.getXAxis());
        var newX = scale(scaleAmt, normX);

        this.transform[0][0] = newX[0];
        this.transform[1][0] = newX[1];
    }

    
    scaleShapeY(scaleAmt)
    {
        var normY = normalize(this.getYAxis());
        var newY = scale(scaleAmt, normY);

        this.transform[0][1] = newY[0];
        this.transform[1][1] = newY[1];
    }

    rotateShape(rad)
    {   

        var rotationMatrix = mat3();

        var range = 0.001;

        rotationMatrix[0][0] = epsilon(Math.cos(rad), range);
        rotationMatrix[0][1] = epsilon(-Math.sin(rad), range);
        rotationMatrix[1][0] = epsilon(Math.sin(rad), range);
        rotationMatrix[1][1] = epsilon(Math.cos(rad), range);
        
        var xAxis = this.getXAxis();
        var yAxis = this.getYAxis();

        this.transform[0][0] = xAxis[0];
        this.transform[0][1] = xAxis[1];

        this.transform[0][1] = yAxis[0];
        this.transform[1][1] = yAxis[1];

        this.transform = mult(this.transform, rotationMatrix);
    }

    transformVertsToWorld()
    {
        var vertices = this.vertices;
        var globalVerts = [];

        for(var i = 0; i < vertices.length; i++)
        {
            globalVerts[i] = mult(this.transform, vec3(vertices[i][0], 
            -vertices[i][1], 1));
                        
            globalVerts[i] = vec2(globalVerts[i][0], globalVerts[i][1]);
        }
        
        return globalVerts;
    }

    render(mode)
    {
        if(mode == "stroke")
            ctx.strokeStyle = this.color;
        else
            ctx.fillStyle = this.color;

        var globalVerts = this.transformVertsToWorld();

        ctx.beginPath();

        ctx.moveTo(globalVerts[0][0], globalVerts[0][1]);

        for(var i = 1; i < globalVerts.length; i++)
        {
            ctx.lineTo(globalVerts[i][0], globalVerts[i][1]);
        }

        ctx.closePath();

        if(mode == "stroke")
            ctx.stroke();
        else
            ctx.fill();
    }
};

class Rectangle extends Shape {

    constructor(position, width, height, color)
    {
        if(!arguments.length) { super(); }
        else
        {
            super(position,
                [ 
                    vec2(-(width/2), -(height/2)),
                    vec2((width/2), -(height/2)),
                    vec2((width/2), (height/2)),
                    vec2(-(width/2), (height/2))
                ], 
                color
                );
        
                this.width = width;
                this.height = height;
        }

    }


    getClassName()
    {
        return "Rectangle";  
    }

    clone()
    {
        var newRect = new Rectangle();
        newRect.width = this.width;
        newRect.height = this.height;

        super.clone(newRect);

        return newRect;
    }

};

class Polygon extends Shape
{
    constructor(position, numberOfSides, size, color)
    {
        if(!arguments.length) { super(); }
        else
        {
            var newPoints = [];

            for(var i = 1; i <= numberOfSides; i++)
            {
                newPoints.push(
                    vec2(
                        size * Math.cos(i * 2 * Math.PI / numberOfSides),
                        size * Math.sin(i * 2 * Math.PI / numberOfSides)
                    )
                );
            }
    
            super(position, newPoints, color);

            this.numberOfSides = numberOfSides;
            this.size = size;
        }

    }

    getClassName()
    {
        return "Polygon";  
    }

    clone()
    {
        var newPoly = new Polygon();
        newPoly.numberOfSides = this.numberOfSides;
        newPoly.size = this.size;

        super.clone(newPoly);

        return newPoly;
    }

}

class Triangle extends Polygon
{
    
    constructor(position, size, color)
    {
        if(!arguments.length) {
            super();
        }
        else
        {
            super(position, 3, size, color);
            this.rotateShape(-Math.PI/6);
        }
    }

    getClassName()
    {
        return "Triangle";  
    }
}

class Line extends Shape
{
    constructor(start, end, color)
    {
        if(!arguments.length) { super(); }
        else
        {
            var position = vec2(
                (start[0] + end[0]) * .5,  
                (start[1] + end[1]) * .5  
            );
            
            super(position, [
                subtract(start, position),
                subtract(end, position),
            ], 
            color
            );

            this.start = start;
            this.end = end;

            this.resetBox();
        }

    }

    fromJSON(obj)
    {
        super.fromJSON(obj['line']);
        this.collisionBox = new Rectangle();
        this.collisionBox.fromJSON(obj['collisionBox']);
    }

    toJSON()
    {
        return {
            line: super.toJSON(),
            collisionBox: this.collisionBox.toJSON()
        }
    }

    getStart()
    {
        return this.transformVertsToWorld()[0];
    }

    getEnd()
    {
        return this.transformVertsToWorld()[1];
    }

    resetBox()
    {
        var line = subtract(this.getEnd(), this.getStart());

        this.collisionBox = new Rectangle(this.getPosition(), 15, length(line) + 2, "#FFFF00");
        this.collisionBox.rotateShape(Math.atan2(-line[1], line[0]) - Math.PI/2);
    }
    
    setPosition(newPos)
    {
        super.setPosition(newPos);
        this.collisionBox.setPosition(newPos);
    }

    getClassName()
    {
        return "Line";  
    }

    clone()
    {
        var newLine = new Line();

        newLine.start = vec2(JSON.parse(JSON.stringify(this.start)));
        newLine.end = vec2(JSON.parse(JSON.stringify(this.end)));

        newLine.collisionBox = this.collisionBox.clone();

        super.clone(newLine);

        return newLine;
    }

    inBound(pos)
    {
        return this.collisionBox.inBound(pos);
    }
    moveShape(offsetVec)
    {
        super.moveShape(offsetVec);
        this.collisionBox.moveShape(offsetVec);
    }

    rotateShape(rad)
    {
        super.rotateShape(rad);
        this.collisionBox.rotateShape(rad);
    }

    scaleShape(scaleAmt)
    {
        super.scaleShape(scaleAmt);
        this.resetBox();
    }

    render()
    {
        super.render("stroke");
        this.collisionBox.render("stroke");
    }
}


class Circle
{
    constructor(position, radius, color)
    {
        if(!arguments.length) {  }
        else
        {
            this.position = position;
            this.radius = radius;
            this.color = color;
        }
    }

    getClassName()
    {
        return "Circle";  
    }

    fromJSON(obj)
    {
        this.color = obj.color;
        this.position = vec2(obj.position);
        this.radius = obj.radius;
    }

    toJSON()
    {
        return {
            color: this.color,
            position: this.position,
            radius: this.radius
        }
    }

    transformVertsToWorld()
    {
        return [
            add(this.position, vec2(this.radius, 0)),
            add(this.position, vec2(-this.radius, 0)),
            add(this.position, vec2(0, this.radius)),
            add(this.position, vec2(0, -this.radius))
        ];
    }

    clone(circle)
    {
        var newCircle = new Circle();
        newCircle.position = vec2(JSON.parse(JSON.stringify(this.position)));
        newCircle.radius = this.radius;
        newCircle.color = this.color;
        
        return newCircle;
    }

    inBound(pos)
    {
        return (length(subtract(pos, this.position)) <= this.radius);
    }

    rotateShape(){}

    getPosition()
    {
        return this.position;
    }

    moveShape(amount)
    {
        this.position = add(this.position, amount);
    }

    setPosition(newPos)
    {
        this.position = vec2(newPos);
    }

    scaleShape(newRadius)
    {
        this.radius = newRadius;
    }

    getRadius()
    {
        return this.radius;
    }

    render()
    {
        ctx.fillStyle = this.color; 
        ctx.beginPath();
        ctx.arc(this.position[0], this.position[1], this.radius, 0, 2 * Math.PI);
        ctx.fill(); 
    }
}


class StaticShapeGroup
{
    constructor(shapes)
    {
        this.shapes = shapes || [];
    }

    
    getClassName()
    {
        return "StaticShapeGroup";  
    }

    clone()
    {

    }
    
    clear()
    {

        while(this.shapes.length)
            this.shapes.pop();
    }


    fromJSON(obj)
    {
        console.log(new classesMapping['Circle']());

        for(var i = 0; i < obj.length; i++)
        {
           var shape = new classesMapping[obj[i]['name']]();
           shape.fromJSON(obj[i]['shapeData']);
           this.add(shape);
        }
    }

    toJSON()
    {
        var json = [];

        for(var i = 0; i < this.shapes.length; i++)
        {
            json.push(
                { 
                    name: this.shapes[i].getClassName(),
                    shapeData: this.shapes[i].toJSON()
            });
        }

        return json;
    }

    inBound(pos)
    {
        for(var i = 0; i < this.shapes.length; i++)
        {
            if(this.shapes[i].inBound(pos))
                return { index: i, shape: this.shapes[i] };
        }

        return false;
    }

    inBoundBackwards(pos)
    {
        for(var i = this.shapes.length - 1; i >= 0; i--)
        {
            if(this.shapes[i].inBound(pos))
                return { index: i, shape: this.shapes[i] };
        }

        return false;

    }

    add(shape)
    {
        this.shapes.push(shape);
    }

    moveShape(offsetVec)
    {
        for(var i = 0; i < this.shapes.length; i++)
        {
            this.shapes[i].moveShape(offsetVec);
        }
    }

    render()
    {
        for(var i = 0; i < this.shapes.length; i++)
        {
            this.shapes[i].render();
        }
    }
}

class DynamicShapeGroup extends Shape
{
    constructor()
    {
        super(vec2(0, 0), [], "#FFFFFF");

        this.shapes = [];

        this.resetMinMax();

    }

    resetMinMax()
    {
        this.maxX = 0;
        this.minX = 1000;

        this.maxY = 0;
        this.minY = 1000;
    }
    getClassName()
    {
        return "DynamicShapeGroup";  
    }

    clone()
    {

    }

    clear()
    {

        while(this.shapes.length)
            this.shapes.pop();

        this.vertices = [];
        this.transform = this.defaultTransform;
    }

    getWidth()
    {
        return this.maxX - this.minX;
    }

    getHeight()
    {
        return this.maxY - this.minY;
    }

    getCenter()
    {
        return vec2((this.maxX + this.minX)/2, (this.maxY + this.minY)/2);
    }

    recalcMax(shape)
    {
        var verts = shape.transformVertsToWorld();

        for(var j = 0; j < verts.length; j++)
        {
            if(verts[j][1] > this.maxY)
                this.maxY = verts[j][1];
            if(verts[j][1] < this.minY)
                this.minY = verts[j][1];
        }

        for(var j = 0; j < verts.length; j++)
        {
            if(verts[j][0] > this.maxX)
                this.maxX = verts[j][0];
            if(verts[j][0] < this.minX)
                this.minX = verts[j][0];
        }        
    }



    inBound(pos)
    {
        for(var i = 0; i < this.shapes.length; i++)
        {
            if(this.shapes[i].inBound(pos))
                return { index: i, shape: this.shapes[i] };
        }

        return false;
    }

    inBoundBackwards(pos)
    {
        for(var i = this.shapes.length - 1; i >= 0; i--)
        {
            if(this.shapes[i].inBound(pos))
                return { index: i, shape: this.shapes[i] };
        }

        return false;

    }

    isEmpty()
    {
        return (this.shapes.length === 0);
    }

    add(shape)
    {
        this.shapes.push(shape);
        this.recalcMax(shape);

        this.rectangle = new Rectangle(this.getCenter(), this.getWidth(), this.getHeight(), "#FFFFFF");
        this.setPosition(this.getCenter());

        this.vertices = [];

        for(var i = 0; i < this.shapes.length; i++)
        {
            this.vertices.push(subtract(this.shapes[i].getPosition(), this.getCenter()))
        }

        this.vertices.push(subtract(shape.getPosition(), this.getCenter()));
    }

    clear()
    {
        this.resetMinMax();

        while(this.shapes.length)
            this.shapes.pop();

        this.vertices = [];
        this.transform = this.defaultTransform;
        
    }

    moveShape(offsetVec)
    {
        super.moveShape(offsetVec);
        this.rectangle.moveShape(offsetVec);

        var verts = this.transformVertsToWorld();

        for(var i = 0; i < this.shapes.length; i++)
        {
            this.shapes[i].setPosition(verts[i]);
        }
    }

    rotateShape(rad){

        super.rotateShape(rad);
        this.rectangle.rotateShape(rad);

        var verts = this.transformVertsToWorld();

        for(var i = 0; i < this.shapes.length; i++)
        {
            this.shapes[i].rotateShape(rad);
            this.shapes[i].setPosition(verts[i]);
        }        
    }

    scaleShape(scaleAmt)
    {
        super.scaleShape(scaleAmt);
        this.rectangle.scaleShape(scaleAmt);

        var verts = this.transformVertsToWorld();

        for(var i = 0; i < this.shapes.length; i++)
        {
            if(this.shapes[i].getClassName() == "Circle")
                this.shapes[i].scaleShape(scaleAmt * 26);
            else
                this.shapes[i].scaleShape(scaleAmt);
            this.shapes[i].setPosition(verts[i]);
        }        
    }

    render()
    {
        if(!this.isEmpty())
        {
            this.rectangle.render("stroke");
        }

        var verts = this.transformVertsToWorld();

        for(var i = 0; i < verts.length; i++)
        {
            var circ = new Circle(verts[i], 3, "#FFFF00");
            circ.render();
        }
    }
}

//------------------------------------------------------------------------------------


function clearScreen()
{
    ctx.fillStyle = "#000000"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function onUp(e)
{
    if(e.button != 0) return;

    var mousePos = vec2(e.clientX, e.clientY);


    if(isSelectionOn)
    {        
        isSelectionOn = false;

        for(var i = 0; i < inSceneShapes.shapes.length; i++)
        {
            var verts = inSceneShapes.shapes[i].transformVertsToWorld();
    
            var allVerticesIn = true;
    
            for(var j = 0; j < verts.length; j++)
            {
                if(!rect.inBound(verts[j]))
                {
                    allVerticesIn = false;
                }
            }
    
            if(allVerticesIn)
                selectionGroup.add(inSceneShapes.shapes[i]);
        }
    
        console.log(selectionGroup);
    }


    window.removeEventListener("mousemove", onMove );

    clearScreen();
    this.selectionGroup.render();
    render();

}


function onDown(e)
{

    var mousePos = vec2(e.clientX, e.clientY);

    if(new Rectangle(vec2(canvas.width/2, canvas.height/2), canvas.width, canvas.height).inBound(mousePos))
    {
        if(!selectionGroup.isEmpty() && !selectionGroup.inBound(mousePos))
        {
            selectionGroup.clear();
            clearScreen();
            render();
    
            return;
        }
    
        if(!selectionGroup.isEmpty() && selectionGroup.inBound(mousePos))
        {
            obj = selectionGroup;
        }
        else
        {
            result = inSceneShapes.inBoundBackwards(mousePos);
    
            if(result)
            {
                inSceneShapes.add(inSceneShapes.shapes.splice(result.index, 1)[0]);
                obj = result.shape;
            }
            else
            {
                result = allShapes.inBound(mousePos);
        
                if(result)
                {
                    var clone = result.shape.clone();
                    inSceneShapes.add(clone);
                    obj = clone;
                }
            }
        
            if(!result)
            {
                isSelectionOn = true;
            }
        
        }
    
        window.addEventListener("mousemove", onMove );    
        initialMousePos = vec2(mousePos);
    }    
}

function calcRotAngle(mousePos)
{
    var xAxis = obj.getXAxis();
    var objToMouse = subtract(mousePos, obj.getPosition());
        
    var yAxis = obj.getYAxis();

    var rotationDir = dot(yAxis, objToMouse);
    var adjust = epsilon(dot(normalize(xAxis), normalize(objToMouse)), 0.0001);

    var rad = (rotationDir >= 0) ? Math.acos(adjust) : -Math.acos(adjust);
    return rad;
}

function calcScaleAmt(movement)
{
    var originToInit = subtract(initialMousePos, obj.getPosition());

    var currLengthX = length(obj.getXAxis());

    scaleAmt = dot(normalize(originToInit), movement) * .013;

    var currLengthX = length(obj.getXAxis());
    scaleAmt += currLengthX;

    scaleAmt = (scaleAmt < 0.2) ? 0.2 : scaleAmt;

    return scaleAmt;
}

function calcCircScaleAmt(movement)
{
    var originToInit = subtract(initialMousePos, obj.getPosition());
    scaleAmt = dot(normalize(originToInit), movement) * .5;

    scaleAmt += obj.getRadius();

    scaleAmt = (scaleAmt < 10) ? 10 : scaleAmt;

    return scaleAmt;
}

function render()
{
    this.allShapes.render();
    this.inSceneShapes.render();

    if(!selectionGroup.isEmpty())
        selectionGroup.render();
}

function onMove(e)
{ 
    clearScreen();

    if(isSelectionOn)
    {
        var newPos = vec2(initialMousePos);
        newPos[0] = newPos[0] + (e.clientX - initialMousePos[0])/2;
        newPos[1] = newPos[1] + (e.clientY - initialMousePos[1])/2;

        rect = new Rectangle(newPos, e.clientX - initialMousePos[0], 
            e.clientY - initialMousePos[1], "#00FF00");

        rect.render("stroke");
    }
    else
    {
        if(currentTransform == "rotate" && obj.getClassName() != "Circle")
            obj.rotateShape(calcRotAngle(vec2(e.clientX, e.clientY)));
        else if(currentTransform == "move")
            obj.moveShape(vec2(e.movementX, e.movementY));
        else if(currentTransform == "scale")
        {
            if(obj.getClassName() == "Circle")
                obj.scaleShape(calcCircScaleAmt(vec2(e.movementX, e.movementY)));
            else
                obj.scaleShape(calcScaleAmt(vec2(e.movementX, e.movementY)));
        }

    }

    render();
}

const classesMapping = {
    'Shape': Shape,
    'Rectangle': Rectangle,
    'Circle': Circle,
    'Line': Line,
    'Triangle': Triangle,
    'Polygon': Polygon
  };


window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");
    ctx = canvas.getContext("2d");
    
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    allShapes = new StaticShapeGroup();
    inSceneShapes = new StaticShapeGroup();

    this.selectionGroup = new DynamicShapeGroup();

    allShapes.add(new Rectangle(vec2(60, 50), 50, 50, "#FF0000"));
    allShapes.add(new Triangle(vec2(60, 150), 26, "#00FF00"));
    allShapes.add(new Line(vec2(40, 200), vec2(90, 230), "#FF00FF")); 
    allShapes.add(new Polygon(vec2(60, 290), 6, 26, "#0000FF"));
    allShapes.add(new Circle(vec2(60, 380), 26, "#FFFF00"));

    this.allShapes.render();
    this.inSceneShapes.render();

    var saveButton = document.getElementById("save");
    var loadButton = document.getElementById("load");
    var clearButton = document.getElementById("clear");

    saveButton.addEventListener('click', function(){
        localStorage.setItem('testObject', JSON.stringify(inSceneShapes.toJSON()));
    })

    loadButton.addEventListener('click', function(){
        inSceneShapes = new StaticShapeGroup();
        inSceneShapes.fromJSON(JSON.parse(localStorage.getItem('testObject')));
        console.log(inSceneShapes);
        render();
    })

    clearButton.addEventListener('click', function(){
        inSceneShapes.clear();
        clearScreen();
        render();
    })

    window.addEventListener("mouseup", onUp )
    window.addEventListener("mousedown", onDown );

    this.onRadioButtonChanged("transform", "currentTransform");
}


function onRadioButtonChanged(radioName, outVar, eventHandler)
{
    var buttons = document.getElementsByName(radioName); 
    
    for(i = 0; i < buttons.length; i++) { 
        buttons[i].addEventListener('change', function(){
            if(this.checked)
            {
                window[outVar] = this.value;
                if (eventHandler) eventHandler();
            }
        });
    }
}
