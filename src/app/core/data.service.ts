import { Injectable } from '@angular/core';
import { Observable, of as observableOf, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { AngularFirestore } from '@angular/fire/firestore';
import { BaseModel } from './models/base.model';
import { Guid } from 'guid-typescript';

@Injectable()
export abstract class DataService<T> {

  abstract collectionName: string;

  constructor(
    protected firestore: AngularFirestore
  ) { }

  getAll(): Observable<Array<T>> {
    return this.firestore.collection(this.collectionName)
    .snapshotChanges()
    .pipe(
      map(
        data =>  data.map(i => {
          return {
            ...i.payload.doc.data(),
            id: i.payload.doc.id,
          } as any;
        })
      )
    );
  }

  getById(id: string): Observable<T> {
    return this.firestore.doc<T>(`${this.collectionName}/${id}`).valueChanges().pipe(
      map((item: any) => {
        if (item) {
          item.id = id;
        }
        return item;
      })
    );
  }

  create(dto: any): Observable<string> {
    dto = this.prepareDto(dto);
    if (!dto.id) {
      dto.id = Guid.create().toString();
    }
    const docRef = this.firestore.collection(this.collectionName).doc(dto.id);
    return from(docRef.set(dto))
      .pipe(
        map(() => dto.id)
      );
  }

  update(id: string, dto: T): Observable<any> {
    dto = this.prepareDto(dto);
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    return from(docRef.set(dto))
      .pipe(
        map(() => id)
      );
  }

  remove(id: string): Observable<any> {
    return from(
      this.firestore.doc<T>(`${this.collectionName}/${id}`).delete()
    );
  }

  protected prepareDto(dto): any {
    if (dto) {
      Object.keys(dto).forEach(key => {
        let value = dto[key];
        if (value === undefined) {
          value = null;
        }
        if (typeof value === 'object' && value instanceof BaseModel) {
          value = Object.assign({}, value);
          value = this.prepareDto(value);
        }
        if (Array.isArray(value)) {
          value = value.map(v => this.prepareDto(v));
        }
        if (!value && key === 'id') {
          value = Guid.create().toString();
        }
        dto[key] = value;
      });
    }
    dto = Object.assign({}, dto);
    return dto;
  }

}
