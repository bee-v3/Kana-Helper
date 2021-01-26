import { Component } from '@angular/core';
import {Kana} from '../kana-interface/kana-interface';
import {HiraganaList, KatakanaList} from '../kana-list/kana-list';
import {KanaSelectorService} from '../kana-selector/kana-selector.service';

@Component({
  selector: 'kana-menu',
  templateUrl: './kana-menu.html',
  styleUrls: ['../../assets/style/mainstyle.css']
})
export class KanaMenu {
  menutype = 0;
  selectedKana: Kana;
  hiragana = HiraganaList;
  katakana = KatakanaList;

  constructor(private kanaselector: KanaSelectorService){ }  // initialize shared service

  showHiragana(){
    this.menutype = 1;
  }

  showKatakana(){
    this.menutype = 2;
  }

  selectKana(k: Kana){
    if (this.selectedKana === k){   // Easy way to reset back to stroke 1 if same kana is selected
      this.kanaselector.newKana(null);
    }
    this.selectedKana = k;
    this.kanaselector.newKana(this.selectedKana);
  }
}
