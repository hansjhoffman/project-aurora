import * as Eq from "fp-ts/Eq";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { pipe, constVoid } from "fp-ts/function";
import * as Str from "fp-ts/string";

import { IBuilder } from "./builder";
import { Message } from "./message";

type Nullable<T> = null | T;
type Env = Record<string, unknown>;

const eqMessage: Eq.Eq<Message> = {
  equals: (m1, m2) =>
    Str.Eq.equals(m1.getSeverity(), m2.getSeverity()) &&
    Str.Eq.equals(m1.getContent(), m2.getContent()),
};

/**
 * Build a TextField.
 *
 * @example
 * import { TextField } from "@";
 *
 * const firstName = new TextField.Builder("First Name")
 *   .withDescription("Legal first name")
 *   .build();
 *
 * @since 0.0.1
 */
export class TextField {
  readonly #label: string;
  readonly #description: string;
  readonly #isRequired: boolean;
  readonly #isReadOnly: boolean;
  readonly #isUnique: boolean;
  readonly #defaultValue: O.Option<string>;
  readonly #computeFn: O.Option<(value: Nullable<string>) => string>;
  readonly #validateFn: O.Option<(value: Nullable<string>) => void | Message>;
  readonly #validateFnAsync: O.Option<
    (value: Nullable<string>, env: Env) => Promise<void | Message>
  >;

  #value: O.Option<string>;
  #messages: ReadonlyArray<Message>;
  #env: Env;

  private constructor(params: {
    label: string;
    description?: string;
    isRequired?: boolean;
    isReadOnly?: boolean;
    isUnique?: boolean;
    defaultValue?: Nullable<string>;
    computeFn?: (value: Nullable<string>) => string;
    validateFn?: (value: Nullable<string>) => void | Message;
    validateFnAsync?: (
      value: Nullable<string>,
      env: Env,
    ) => Promise<void | Message>;
  }) {
    // params
    this.#label = params.label;
    this.#description = pipe(
      O.fromNullable(params.description),
      O.getOrElse(() => ""),
    );
    this.#isRequired = pipe(
      O.fromNullable(params.isRequired),
      O.getOrElse(() => false),
    );
    this.#isReadOnly = pipe(
      O.fromNullable(params.isReadOnly),
      O.getOrElse(() => false),
    );
    this.#isUnique = pipe(
      O.fromNullable(params.isUnique),
      O.getOrElse(() => false),
    );
    this.#defaultValue = O.fromNullable(params.defaultValue);
    this.#computeFn = O.fromNullable(params.computeFn);
    this.#validateFn = O.fromNullable(params.validateFn);
    this.#validateFnAsync = O.fromNullable(params.validateFnAsync);

    // internal
    this.#value = O.none;
    this.#messages = [];
    this.#env = {};
  }

  /* Label */

  public getLabel(): string {
    return this.#label;
  }

  /* Description */

  public getDescription(): string {
    return this.#description;
  }

  /* Required */

  public getIsRequired(): boolean {
    return this.#isRequired;
  }

  /* ReadOnly */

  public getIsReadOnly(): boolean {
    return this.#isReadOnly;
  }

  /* Unique */

  public getIsUnique(): boolean {
    return this.#isUnique;
  }

  /* Compute Fn */

  private _runComputeFn(): void {
    pipe(
      this.#computeFn,
      O.match(constVoid, (computeFn) => {
        pipe(
          this.#value,
          O.match(constVoid, (currentValue) => {
            const newValue = computeFn(currentValue);
            this.setValue(newValue);
          }),
        );
      }),
    );
  }

  /* Validate Fn */

  private _runValidateFn(): void {
    pipe(
      this.#validateFn,
      O.match(constVoid, (validateFn) => {
        pipe(
          this.#value,
          O.match(constVoid, (currentValue) => {
            const message = validateFn(currentValue);

            if (message) {
              this._addMessage(message);
            }
          }),
        );
      }),
    );
  }

  private async _runValidateAsync(): Promise<void> {
    pipe(
      this.#validateFnAsync,
      O.match(constVoid, (validateFnAsync) => {
        pipe(
          this.#value,
          O.match(constVoid, async (currentValue) => {
            const message = await validateFnAsync(currentValue, this.#env);

            if (message) {
              this._addMessage(message);
            }
          }),
        );
      }),
    );
  }

  /**
   * Runs all sync and async operations.
   */
  public run(): void {
    this._runComputeFn();
    this._runValidateFn();
    this._runValidateAsync();
  }

  /* Value */

  public getValue(): Nullable<string> {
    return pipe(
      this.#value,
      O.getOrElse(() => {
        return pipe(
          this.#defaultValue,
          O.getOrElseW(() => null),
        );
      }),
    );
  }

  public setValue(value: string): void {
    this.#value = O.some(value);
  }

  /* Messages */

  public getMessages(): ReadonlyArray<Message> {
    return this.#messages;
  }

  private _addMessage(message: Message): void {
    this.#messages = pipe(
      this.#messages,
      RA.append(message),
      RA.uniq(eqMessage),
    );
  }

  /* Env */

  public getEnv(): Env {
    return this.#env;
  }

  public setEnv(env: Env): void {
    this.#env = env;
  }

  //---------------------------------------
  // Builder
  //---------------------------------------

  static Builder = class TextFieldBuilder implements IBuilder<TextField> {
    readonly #label: string;
    #description?: string;
    #isRequired?: boolean;
    #isReadOnly?: boolean;
    #isUnique?: boolean;
    #defaultValue?: Nullable<string>;
    #computeFn?: (value: Nullable<string>) => string;
    #validateFn?: (value: Nullable<string>) => void | Message;
    #validateFnAsync?: (
      value: Nullable<string>,
      env: Env,
    ) => Promise<void | Message>;

    /**
     * Creates a simple, empty TextField.
     *
     * @param label
     */
    constructor(label: string) {
      this.#label = label;
    }

    /**
     * Sets the value in the UI table the user will see when they hover their mouse over the column header.
     *
     * @param description - Visible on hover of column header.
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withDescription(description: string): this {
      this.#description = description;

      return this;
    }

    /**
     * Ensures a field must have a value otherwise an error message will be present.
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withRequired(): this {
      this.#isRequired = true;

      return this;
    }

    /**
     * Ensures a user cannot edit the value.
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withReadOnly(): this {
      this.#isReadOnly = true;

      return this;
    }

    /**
     * Ensures a value is unique in the entire column.
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withUnique(): this {
      this.#isUnique = true;

      return this;
    }

    /**
     * Sets a default value when none was provided by the user.
     *
     * @param value
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withDefault(value: string): this {
      this.#defaultValue = value;

      return this;
    }

    /**
     * Change the current value into something new.
     *
     * @param handler
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withCompute(handler: (value: Nullable<string>) => string): this {
      this.#computeFn = handler;

      return this;
    }

    /**
     * Validate the current value against certain conditions and display a message to the user when those conditions are not met.
     *
     * @param handler
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withValidate(handler: (value: Nullable<string>) => void | Message): this {
      this.#validateFn = handler;

      return this;
    }

    /**
     * Sets the value asynchronously.
     *
     * @param handler
     *
     * @returns this
     *
     * @since 0.0.1
     */
    withValidateAsync(
      handler: (value: Nullable<string>, env: Env) => Promise<void | Message>,
    ): this {
      this.#validateFnAsync = handler;

      return this;
    }

    /**
     * Final call to return an instantiated TextField.
     *
     * @returns TextField
     *
     * @since 0.0.1
     */
    build() {
      return new TextField({
        label: this.#label,
        description: this.#description,
        isRequired: this.#isRequired,
        isUnique: this.#isUnique,
        isReadOnly: this.#isReadOnly,
        defaultValue: this.#defaultValue,
        computeFn: this.#computeFn,
        validateFn: this.#validateFn,
        validateFnAsync: this.#validateFnAsync,
      });
    }
  };
}
