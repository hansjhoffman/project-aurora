import { TextField } from "../../src/field/textField";
import { Sheet} from "../../src/sheet/sheet";

describe("Sheet", () => {
  it("should handle simple creation", () => {
    const textField = new TextField.Builder("Foo").build();
    const sheet = new Sheet.Builder("Bar").withField("foo", textField).build();

    expect(sheet.getDisplayName()).toBe("Bar");
  });

  it("should handle creation with no sheets", () => {
    expect(() => {
      new Sheet.Builder("Bar").build();
    }).toThrowError(Error("A Sheet must include at least one field."));
  });
});
