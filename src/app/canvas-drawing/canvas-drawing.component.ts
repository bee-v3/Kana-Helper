import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import { KanaSelectorService } from '../kana-selector/kana-selector.service';
import { KanaStroke } from '../kana-stroke-interface/kana-stroke-interface';
import { fromEvent, merge } from 'rxjs';
import { switchMap, takeUntil, pairwise, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Component({
  selector: '<canvas-drawing>',
  templateUrl: './canvas-drawing.html',
  styleUrls: ['../../assets/style/mainstyle.css']
})

export class CanvasComponent implements AfterViewInit {
  @ViewChild('canvas') public canvas: ElementRef;

  private cx: CanvasRenderingContext2D;
  private userpath: Path2D;   // Holds the line drawn by the user
  private selectedKana: [KanaStroke] = null;    // Points to the kana selected by the user
  private step = 0;   // Which part of the stroke order the user is on
  private maxstep = 0;  // Maximum number of strokes the selected kana has
  completed = false;  // whether or not the kana has been completed by the user

  constructor(private kanaselector: KanaSelectorService){}

  /* Called after component's view initializes.
   * Sets canvas properties
   */
  public ngAfterViewInit() {
    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    canvasEl.width = environment.canvaswidth;
    canvasEl.height = environment.canvaswidth;

    this.cx = canvasEl.getContext('2d');
    this.cx.lineWidth = 11;
    this.cx.lineCap = 'round';
    this.cx.strokeStyle = '#000';

    this.captureEvents(canvasEl);
  }

  /* Subscribes to events necessary for drawing and monitoring user kana selection and performs a one time drawing
   * when the subscription changes.
   * @param canvasEl the canvas element rendered on the page
   */
  private captureEvents(canvasEl: HTMLCanvasElement) {
    // subscribe to kana selection
    this.kanaselector.sharedkana.subscribe(k => {
      this.cx.clearRect(0, 0, environment.canvaswidth, environment.canvasheight);
      this.selectedKana = k;
      if (this.selectedKana !== null && this.selectedKana !== null && this.selectedKana.length > 0){
        this.completed = false;
        this.step = 1;
        this.maxstep = this.selectedKana[this.selectedKana.length - 1].svgstep;
        this.drawKana(this.selectedKana);
      }
    });

    const downEvent$ = merge(fromEvent(canvasEl, 'mousedown'), fromEvent(canvasEl, 'touchstart'));
    const upEvents$ = merge(fromEvent(canvasEl, 'mouseup'), fromEvent(canvasEl, 'touchend'));
    const moveEvents$ = merge(fromEvent(canvasEl, 'mousemove'), fromEvent(canvasEl, 'touchmove'));
    const leaveEvents$ = merge(fromEvent(canvasEl, 'mouseleave'), fromEvent(canvasEl, 'touchleave'));


    // subscribe to mousedown events on the canvas and draw lines
    const starts =
    downEvent$
      .pipe(
        switchMap((e) => {
          this.userpath = new Path2D();   // Clear user drawn path upon mousedown event
          e.preventDefault();
          return moveEvents$
            .pipe(
              takeUntil(upEvents$), takeUntil(leaveEvents$),
              pairwise(),

              // occurs whenever user finishes drawing line on canvas (when drawing subscription completes)
              finalize(async () => {
                this.cx.clearRect(0, 0, environment.canvaswidth, environment.canvasheight);

                if (this.selectedKana === null || this.userpath === null){ return; }
                try{
                    if (!this.completed && await this.scoreKana(this.userpath, this.selectedKana)){
                      this.step++;
                      if (this.step > this.maxstep){this.completed = true; }
                    }
                    await this.drawKana(this.selectedKana);
                  } catch (e) {
                    console.log('Error: ' + e);
                    await this.drawKana(this.selectedKana);
                  }
              })
            );
        })
      )
      .subscribe((res: [MouseEvent | TouchEvent, MouseEvent | TouchEvent] ) => {

        const rect = canvasEl.getBoundingClientRect();

        if (window.TouchEvent && res[0] instanceof TouchEvent && res[1] instanceof TouchEvent){
          const prevPos = {
            x: res[0].touches[0].clientX - rect.left,
            y: res[0].touches[0].clientY - rect.top
          };

          const currentPos = {
            x: res[1].touches[0].clientX - rect.left,
            y: res[1].touches[0].clientY - rect.top
          };
          this.drawMouseStroke(prevPos, currentPos);
        }
        else if (res[0] instanceof MouseEvent && res[1] instanceof MouseEvent){
          const prevPos = {
            x: res[0].clientX - rect.left,
            y: res[0].clientY - rect.top
          };

          const currentPos = {
            x: res[1].clientX - rect.left,
            y: res[1].clientY - rect.top
          };
          this.drawMouseStroke(prevPos, currentPos);
        }
        else{
          return;
        }
      });
  }

  /*
   *
   */
  private drawMouseStroke(prevPos: { x: number, y: number }, currentPos: { x: number, y: number }) {
    if (!this.cx) { return; }
    const addedPath = new Path2D();
    this.cx.beginPath();

    if (prevPos) {
      this.cx.moveTo(prevPos.x, prevPos.y);
      this.cx.lineTo(currentPos.x, currentPos.y);
      this.cx.stroke();

      if (this.selectedKana){
        addedPath.moveTo(prevPos.x, prevPos.y);
        addedPath.lineTo(currentPos.x, currentPos.y);
        this.userpath.addPath(addedPath);
      }
    }
  }

  private async drawKana(k: [KanaStroke]){
    if (this.selectedKana === null || !this.cx){return; }

    const completedpaths = new Path2D();
    const currentpaths = new Path2D();
    const incompletepaths = new Path2D();

    k.forEach((element) => {
      if (element.svgstep < this.step){
        completedpaths.addPath(element.strokepath);
      }
      else if (element.svgstep === this.step){
        currentpaths.addPath(element.strokepath);
      }
      else if (element.svgstep > this.step){
        incompletepaths.addPath(element.strokepath);
      }

      this.cx.stroke(incompletepaths);
      this.cx.stroke(completedpaths);
      this.cx.stroke(currentpaths);

      this.cx.fillStyle = '#0F0';
      this.cx.fill(completedpaths);
      this.cx.fillStyle = '#888';
      this.cx.fill(incompletepaths);
      this.cx.fillStyle = '#F00';
      this.cx.fill(currentpaths);
    });
  }

  private async scoreKana(drawnpath: Path2D, k: [KanaStroke]){
    if (!this.cx){ return; }
    const currentpath = new Path2D();

    // select all paths that match the current kana stroke to be drawn and add it to currentpath
    k.forEach((element) => {
      if (element.svgstep === this.step){
        currentpath.addPath(element.strokepath);
      }
    });

    const userstrokecanvas = document.createElement('canvas');
    userstrokecanvas.width = environment.canvaswidth;
    userstrokecanvas.height = environment.canvasheight;

    const ux = userstrokecanvas.getContext('2d');
    ux.lineWidth = this.cx.lineWidth;
    ux.lineCap = this.cx.lineCap;
    ux.strokeStyle = this.cx.strokeStyle;

    const kanastrokecanvas = document.createElement('canvas');
    kanastrokecanvas.width = environment.canvaswidth;
    kanastrokecanvas.height = environment.canvasheight;

    const kx = kanastrokecanvas.getContext('2d');
    kx.lineWidth = this.cx.lineWidth;
    kx.lineCap = this.cx.lineCap;
    kx.strokeStyle = this.cx.strokeStyle;

    // Collect pixel counts of user-drawn path and path of the current stroke
    ux.stroke(drawnpath);
    kx.stroke(currentpath);
    kx.fill(currentpath);

    return await this.canvasPixelCount(ux, kx, environment.canvaswidth, environment.canvasheight);
 }

  /* Compares two CanvasRenderingContext2D to determine overlap and returns a boolean based on define values
   */
  private async canvasPixelCount(u: CanvasRenderingContext2D, k: CanvasRenderingContext2D, width: number, height: number){
    if (!u || !k || !width || !height){
      return;
    }
    const uxcanvas = u.getImageData(0, 0, width, height).data;
    const kxcanvas = k.getImageData(0, 0, width, height).data;
    let upixelcount = 0;  // Number of pixels in user drawn path
    let kpixelcount = 0;  // Number of pixels in current kana stroke
    let outsidelines = 0; // Number of pixels in user drawn path that fall outside of the current kana stroke
    let unfilledpixels = 0; // Number of pixels in the current kana stroke that haven't been covered by  the user's stroke

    // check each canvas to count overlapping, non-overlapping and total pixels
    for (let y = 0, i = 0 ; y < height; y++){
      for (let x = 0; x < width; x++, i += 4){
        if (uxcanvas[i + 3] > 0){
          upixelcount++;
          if (kxcanvas[i + 3] === 0){outsidelines++; }
          else {kpixelcount++; }
        }
        else if (kxcanvas[i + 3] > 0){kpixelcount++; unfilledpixels++; }
      }
    }
    // Determine if user completed the stroke well enough to pass
    return Math.round((outsidelines / upixelcount) * 100) < environment.outsidelines && Math.round((unfilledpixels / kpixelcount) * 100) < environment.unfilledpixels;
  }

  public getCompleted() {
    return this.completed;
  }
}
