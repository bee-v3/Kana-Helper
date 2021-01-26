import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Kana } from '../kana-interface/kana-interface';
import * as svgPath from 'svgpath';   // Used for scaling path data directly instead of scaling the canvas
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})



export class KanaSelectorService {
  private currentKana = new BehaviorSubject(null);
  public sharedkana = this.currentKana.asObservable();


  constructor(private http: HttpClient) { }

  /* This function parses an svg file, taking individual path data and storing them in a format compatible with
   * the Kana interface in ../kana-interface/kana-interface.ts. If animation paths are found, the function HEAVILY
   * assumes the file is formatted like those found in the AnimCJK project, which is a set of paths
   * for a stroke of a kana character followed by a set of strokes to be animated.
   * Ex. in an svg file with 8 total paths, the first 4 are assumed to be for drawing solid strokes followed by 4
   * same ordered corresponding animation paths with a 'style' attribute for animation timing.
   *
   * @param k Kana object
   */
  newKana(k: Kana){
    if (k === undefined || Object.values(k).some(e => e === undefined)){
      this.currentKana.next(null);
      return;
    }

    this.http.get(environment.svgfiles + k.location + k.fname + '.svg', { responseType: 'text'})
        .toPromise()
        .then(async data => {
          const parser = new DOMParser();
          return parser.parseFromString(data, 'text/xml');  // parse svg file into virtual dom

        })
        .then(p => {
          const v = p.children[0].getAttribute('viewBox');
          const viewboxsize = parseInt(v.substr(v.lastIndexOf(' ', v.length - 1)), 10);
          const nodelist  =  p.children[0].querySelectorAll('path');  // return array of nodes containing svg path data
          const pathlist = [];
          const animationlist = [];

          // Split animation paths off to a seperate array
          for (let l = 0; l < nodelist.length; l++){

            if (nodelist[l].hasAttribute('clip-path')){
              animationlist.push(nodelist[l]);
            } else{
              pathlist.push(nodelist[l]);
            }
          }

          const svgdrawingpaths = [];

          for (let i = 0; i < pathlist.length; i++){
            const step = (animationlist.length > 0) ? parseInt((animationlist[i].getAttribute('style').replace(/[-sS;d:]+/g, '')), 10) : i + 1;
            svgdrawingpaths.push({
              svgstep: step, strokepath: new Path2D(svgPath(pathlist[i].getAttribute('d'))
                .scale(environment.canvasheight / viewboxsize).toString()),
              animationpath: (animationlist.length > 0) ? new Path2D(svgPath(animationlist[i].getAttribute('d'))
                .scale(environment.canvasheight / viewboxsize).toString()) : Path2D
            });
          }

          return svgdrawingpaths;
        })
        .then(
          s => {this.currentKana.next(s); }
        )
        .catch(error => {console.log('Error: kana not found.'); });
  }

  ngOnDestroy(): void {
    this.currentKana.next(null);
  }
}
